import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
	matches,
	matchPicks,
	rounds,
	userRoundPicks,
	users,
} from "~/server/db/schema";

export const picksRouter = createTRPCRouter({
	/**
	 * Submit picks for a round
	 */
	submitRoundPicks: protectedProcedure
		.input(
			z.object({
				roundId: z.number().int(),
				picks: z.array(
					z.object({
						matchId: z.number().int(),
						predictedWinner: z.string(),
						predictedSetsWon: z.number().int().min(2).max(3),
						predictedSetsLost: z.number().int().min(0).max(2),
					}),
				),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Ensure user exists in database (webhook might not have fired yet)
			await ctx.db
				.insert(users)
				.values({
					id: ctx.user.id,
					clerkId: ctx.user.id,
					email: ctx.user.email,
					displayName: ctx.user.displayName,
					imageUrl: ctx.user.imageUrl,
					role: ctx.user.role,
				})
				.onConflictDoUpdate({
					target: users.clerkId,
					set: {
						email: ctx.user.email,
						displayName: ctx.user.displayName,
						imageUrl: ctx.user.imageUrl,
						role: ctx.user.role,
					},
				});

			// Get the round and verify it's active
			const round = await ctx.db.query.rounds.findFirst({
				where: eq(rounds.id, input.roundId),
				with: {
					matches: {
						where: isNull(matches.deletedAt),
					},
					tournament: {
						columns: {
							id: true,
							name: true,
							status: true,
							format: true,
						},
					},
				},
			});

			if (!round) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Round not found",
				});
			}

			if (!round.isActive) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "This round is not currently accepting picks",
				});
			}

			if (round.submissionsClosedAt) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Submissions for this round have been closed",
				});
			}

			// Check if round has opened yet
			if (round.opensAt && new Date() < new Date(round.opensAt)) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "This round is not yet open for submissions",
				});
			}

			// Check if user has already submitted picks for this round
			const existingPicks = await ctx.db.query.userRoundPicks.findFirst({
				where: and(
					eq(userRoundPicks.userId, ctx.user.id),
					eq(userRoundPicks.roundId, input.roundId),
				),
			});

			// Only reject if a final (non-draft) submission exists
			if (existingPicks && !existingPicks.isDraft) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "You have already submitted picks for this round",
				});
			}

			// Validate that all picks are for matches in this round
			const roundMatchIds = new Set(round.matches.map((m) => m.id));
			for (const pick of input.picks) {
				if (!roundMatchIds.has(pick.matchId)) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Match ${pick.matchId} is not in this round`,
					});
				}
			}

			// Get tournament format for score validation
			const tournamentFormat = round.tournament.format;
			const requiredSetsToWin = tournamentFormat === "bo5" ? 3 : 2;

			// Validate that each pick has a valid winner
			for (const pick of input.picks) {
				const match = round.matches.find((m) => m.id === pick.matchId);
				if (!match) continue;

				if (
					pick.predictedWinner !== match.player1Name &&
					pick.predictedWinner !== match.player2Name
				) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Invalid winner for match ${pick.matchId}. Must be either ${match.player1Name} or ${match.player2Name}`,
					});
				}

				// Validate sets based on tournament format
				if (pick.predictedSetsWon !== requiredSetsToWin) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Invalid score: winner must have won exactly ${requiredSetsToWin} sets for ${tournamentFormat === "bo5" ? "Best of 5" : "Best of 3"} format`,
					});
				}

				const maxSetsLost = requiredSetsToWin - 1;
				if (
					pick.predictedSetsLost < 0 ||
					pick.predictedSetsLost > maxSetsLost
				) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Invalid score: sets lost must be between 0 and ${maxSetsLost} for ${tournamentFormat === "bo5" ? "Best of 5" : "Best of 3"} format`,
					});
				}
			}

			// Create user round pick and all match picks in a transaction
			return await ctx.db.transaction(async (tx) => {
				let userRoundPick;

				if (existingPicks?.isDraft) {
					// Update existing draft to final submission
					const [updated] = await tx
						.update(userRoundPicks)
						.set({ isDraft: false, submittedAt: new Date() })
						.where(eq(userRoundPicks.id, existingPicks.id))
						.returning();

					if (!updated) {
						throw new Error("Failed to update user round pick");
					}
					userRoundPick = updated;

					// Delete old draft match picks
					await tx
						.delete(matchPicks)
						.where(eq(matchPicks.userRoundPickId, existingPicks.id));
				} else {
					// Create new user round pick
					const [created] = await tx
						.insert(userRoundPicks)
						.values({
							userId: ctx.user.id,
							roundId: input.roundId,
							isDraft: false,
							submittedAt: new Date(),
							totalPoints: 0,
							correctWinners: 0,
							exactScores: 0,
						})
						.returning();

					if (!created) {
						throw new Error("Failed to create user round pick");
					}
					userRoundPick = created;
				}

				// Create all match picks
				const matchPickValues = input.picks.map((pick) => ({
					userRoundPickId: userRoundPick.id,
					matchId: pick.matchId,
					predictedWinner: pick.predictedWinner,
					predictedSetsWon: pick.predictedSetsWon,
					predictedSetsLost: pick.predictedSetsLost,
					pointsEarned: 0,
				}));

				await tx.insert(matchPicks).values(matchPickValues);

				return userRoundPick;
			});
		}),

	/**
	 * Get user's picks for a round
	 */
	getUserRoundPicks: protectedProcedure
		.input(
			z.object({
				roundId: z.number().int(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const userRoundPick = await ctx.db.query.userRoundPicks.findFirst({
				where: and(
					eq(userRoundPicks.userId, ctx.user.id),
					eq(userRoundPicks.roundId, input.roundId),
				),
				with: {
					round: {
						with: {
							tournament: true,
						},
					},
					matchPicks: {
						with: {
							match: true,
						},
					},
				},
			});

			return userRoundPick;
		}),

	/**
	 * Get all picks for a user in a tournament
	 */
	getUserTournamentPicks: protectedProcedure
		.input(
			z.object({
				tournamentId: z.number().int(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Get all rounds for this tournament
			const tournamentRounds = await ctx.db.query.rounds.findMany({
				where: eq(rounds.tournamentId, input.tournamentId),
			});

			const roundIds = tournamentRounds.map((r) => r.id);

			// Get all user picks for these rounds
			const picks = await ctx.db.query.userRoundPicks.findMany({
				where: and(
					eq(userRoundPicks.userId, ctx.user.id),
					// @ts-expect-error - inArray type issue
					eq(userRoundPicks.roundId, roundIds),
				),
				with: {
					round: true,
					matchPicks: {
						with: {
							match: true,
						},
					},
				},
			});

			return picks;
		}),

	/**
	 * Save picks as a draft (allows partial picks)
	 */
	saveRoundPicksDraft: protectedProcedure
		.input(
			z.object({
				roundId: z.number().int(),
				picks: z.array(
					z.object({
						matchId: z.number().int(),
						predictedWinner: z.string(),
						predictedSetsWon: z.number().int().min(2).max(3),
						predictedSetsLost: z.number().int().min(0).max(2),
					}),
				),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Ensure user exists in database
			await ctx.db
				.insert(users)
				.values({
					id: ctx.user.id,
					clerkId: ctx.user.id,
					email: ctx.user.email,
					displayName: ctx.user.displayName,
					imageUrl: ctx.user.imageUrl,
					role: ctx.user.role,
				})
				.onConflictDoUpdate({
					target: users.clerkId,
					set: {
						email: ctx.user.email,
						displayName: ctx.user.displayName,
						imageUrl: ctx.user.imageUrl,
						role: ctx.user.role,
					},
				});

			// Get the round and verify it's active
			const round = await ctx.db.query.rounds.findFirst({
				where: eq(rounds.id, input.roundId),
				with: {
					matches: {
						where: isNull(matches.deletedAt),
					},
					tournament: {
						columns: {
							id: true,
							name: true,
							status: true,
							format: true,
						},
					},
				},
			});

			if (!round) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Round not found",
				});
			}

			if (!round.isActive) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "This round is not currently accepting picks",
				});
			}

			if (round.submissionsClosedAt) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Submissions for this round have been closed",
				});
			}

			// Check if round has opened yet
			if (round.opensAt && new Date() < new Date(round.opensAt)) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "This round is not yet open for submissions",
				});
			}

			// Check if user has already submitted final picks for this round
			const existingPicks = await ctx.db.query.userRoundPicks.findFirst({
				where: and(
					eq(userRoundPicks.userId, ctx.user.id),
					eq(userRoundPicks.roundId, input.roundId),
				),
			});

			// Cannot save draft if final picks already submitted
			if (existingPicks && !existingPicks.isDraft) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "You have already submitted final picks for this round",
				});
			}

			// Validate picks are for matches in this round
			const roundMatchIds = new Set(round.matches.map((m) => m.id));
			for (const pick of input.picks) {
				if (!roundMatchIds.has(pick.matchId)) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Match ${pick.matchId} is not in this round`,
					});
				}
			}

			// Get tournament format for score validation
			const tournamentFormat = round.tournament.format;
			const requiredSetsToWin = tournamentFormat === "bo5" ? 3 : 2;

			// Validate provided picks (partial is OK)
			for (const pick of input.picks) {
				const match = round.matches.find((m) => m.id === pick.matchId);
				if (!match) continue;

				if (
					pick.predictedWinner !== match.player1Name &&
					pick.predictedWinner !== match.player2Name
				) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Invalid winner for match ${pick.matchId}. Must be either ${match.player1Name} or ${match.player2Name}`,
					});
				}

				// Validate sets based on tournament format
				if (pick.predictedSetsWon !== requiredSetsToWin) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Invalid score: winner must have won exactly ${requiredSetsToWin} sets for ${tournamentFormat === "bo5" ? "Best of 5" : "Best of 3"} format`,
					});
				}

				const maxSetsLost = requiredSetsToWin - 1;
				if (
					pick.predictedSetsLost < 0 ||
					pick.predictedSetsLost > maxSetsLost
				) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Invalid score: sets lost must be between 0 and ${maxSetsLost} for ${tournamentFormat === "bo5" ? "Best of 5" : "Best of 3"} format`,
					});
				}
			}

			// Save draft in transaction
			return await ctx.db.transaction(async (tx) => {
				let userRoundPick;

				if (existingPicks?.isDraft) {
					// Update existing draft
					const [updated] = await tx
						.update(userRoundPicks)
						.set({ submittedAt: new Date() })
						.where(eq(userRoundPicks.id, existingPicks.id))
						.returning();

					if (!updated) {
						throw new Error("Failed to update draft");
					}
					userRoundPick = updated;

					// Delete old draft match picks
					await tx
						.delete(matchPicks)
						.where(eq(matchPicks.userRoundPickId, existingPicks.id));
				} else {
					// Create new draft
					const [created] = await tx
						.insert(userRoundPicks)
						.values({
							userId: ctx.user.id,
							roundId: input.roundId,
							isDraft: true,
							submittedAt: new Date(),
							totalPoints: 0,
							correctWinners: 0,
							exactScores: 0,
						})
						.returning();

					if (!created) {
						throw new Error("Failed to create draft");
					}
					userRoundPick = created;
				}

				// Create match picks for the draft
				if (input.picks.length > 0) {
					const matchPickValues = input.picks.map((pick) => ({
						userRoundPickId: userRoundPick.id,
						matchId: pick.matchId,
						predictedWinner: pick.predictedWinner,
						predictedSetsWon: pick.predictedSetsWon,
						predictedSetsLost: pick.predictedSetsLost,
						pointsEarned: 0,
					}));

					await tx.insert(matchPicks).values(matchPickValues);
				}

				return userRoundPick;
			});
		}),

	/**
	 * Get comparison data between current user and another user for a round
	 * Only allowed if the current user has submitted (non-draft) picks for this round
	 */
	getPicksComparison: protectedProcedure
		.input(
			z.object({
				roundId: z.number().int(),
				otherUserId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Verify round exists and get tournament info
			const round = await ctx.db.query.rounds.findFirst({
				where: eq(rounds.id, input.roundId),
				with: {
					tournament: true,
					matches: {
						where: isNull(matches.deletedAt),
						orderBy: (matches, { asc }) => [asc(matches.matchNumber)],
					},
				},
			});

			if (!round) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Round not found",
				});
			}

			// Check if current user has submitted (non-draft) picks for this round
			const currentUserPicks = await ctx.db.query.userRoundPicks.findFirst({
				where: and(
					eq(userRoundPicks.userId, ctx.user.id),
					eq(userRoundPicks.roundId, input.roundId),
					eq(userRoundPicks.isDraft, false),
				),
				with: {
					matchPicks: true,
				},
			});

			if (!currentUserPicks) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"You must submit your picks before viewing other players' picks",
				});
			}

			// Get other user's picks (only non-draft)
			const otherUserPicks = await ctx.db.query.userRoundPicks.findFirst({
				where: and(
					eq(userRoundPicks.userId, input.otherUserId),
					eq(userRoundPicks.roundId, input.roundId),
					eq(userRoundPicks.isDraft, false),
				),
				with: {
					matchPicks: true,
					user: {
						columns: {
							id: true,
							displayName: true,
						},
					},
				},
			});

			if (!otherUserPicks) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "This user has not submitted picks for this round",
				});
			}

			// Build comparison data
			const matchComparisons = round.matches.map((match) => {
				const currentUserPick = currentUserPicks.matchPicks.find(
					(p) => p.matchId === match.id,
				);
				const otherUserPick = otherUserPicks.matchPicks.find(
					(p) => p.matchId === match.id,
				);

				const sameWinner =
					currentUserPick?.predictedWinner === otherUserPick?.predictedWinner;
				const sameScore =
					sameWinner &&
					currentUserPick?.predictedSetsWon ===
						otherUserPick?.predictedSetsWon &&
					currentUserPick?.predictedSetsLost ===
						otherUserPick?.predictedSetsLost;

				return {
					match: {
						id: match.id,
						matchNumber: match.matchNumber,
						player1Name: match.player1Name,
						player2Name: match.player2Name,
						player1Seed: match.player1Seed,
						player2Seed: match.player2Seed,
						winnerName: match.winnerName,
						finalScore: match.finalScore,
						status: match.status,
					},
					currentUserPick: currentUserPick
						? {
								predictedWinner: currentUserPick.predictedWinner,
								predictedSetsWon: currentUserPick.predictedSetsWon,
								predictedSetsLost: currentUserPick.predictedSetsLost,
								isWinnerCorrect: currentUserPick.isWinnerCorrect,
								isExactScore: currentUserPick.isExactScore,
								pointsEarned: currentUserPick.pointsEarned,
							}
						: null,
					otherUserPick: otherUserPick
						? {
								predictedWinner: otherUserPick.predictedWinner,
								predictedSetsWon: otherUserPick.predictedSetsWon,
								predictedSetsLost: otherUserPick.predictedSetsLost,
								isWinnerCorrect: otherUserPick.isWinnerCorrect,
								isExactScore: otherUserPick.isExactScore,
								pointsEarned: otherUserPick.pointsEarned,
							}
						: null,
					sameWinner,
					sameScore,
				};
			});

			return {
				round: {
					id: round.id,
					name: round.name,
					roundNumber: round.roundNumber,
				},
				tournament: {
					id: round.tournament.id,
					name: round.tournament.name,
				},
				otherUser: {
					id: otherUserPicks.user.id,
					displayName: otherUserPicks.user.displayName,
				},
				currentUserStats: {
					totalPoints: currentUserPicks.totalPoints,
					correctWinners: currentUserPicks.correctWinners,
					exactScores: currentUserPicks.exactScores,
				},
				otherUserStats: {
					totalPoints: otherUserPicks.totalPoints,
					correctWinners: otherUserPicks.correctWinners,
					exactScores: otherUserPicks.exactScores,
				},
				matchComparisons,
			};
		}),

	/**
	 * Get all picks for a specific match
	 * Only allowed if the current user has submitted (non-draft) picks for this match's round
	 */
	getAllPicksForMatch: protectedProcedure
		.input(z.object({ matchId: z.number().int() }))
		.query(async ({ ctx, input }) => {
			// Get the match with round info
			const match = await ctx.db.query.matches.findFirst({
				where: eq(matches.id, input.matchId),
				with: {
					round: {
						with: {
							tournament: {
								columns: {
									id: true,
									name: true,
								},
							},
						},
					},
				},
			});

			if (!match) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Match not found",
				});
			}

			// Check if current user has submitted (non-draft) picks for this round
			const currentUserRoundPicks = await ctx.db.query.userRoundPicks.findFirst(
				{
					where: and(
						eq(userRoundPicks.userId, ctx.user.id),
						eq(userRoundPicks.roundId, match.roundId),
						eq(userRoundPicks.isDraft, false),
					),
				},
			);

			if (!currentUserRoundPicks) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"You must submit your picks before viewing other players' picks",
				});
			}

			// Get all non-draft user round picks for this round
			const allRoundPicks = await ctx.db.query.userRoundPicks.findMany({
				where: and(
					eq(userRoundPicks.roundId, match.roundId),
					eq(userRoundPicks.isDraft, false),
				),
				with: {
					user: {
						columns: {
							id: true,
							displayName: true,
							imageUrl: true,
						},
					},
					matchPicks: {
						where: eq(matchPicks.matchId, input.matchId),
					},
				},
			});

			// Build the response
			const picks = allRoundPicks
				.map((roundPick) => {
					const matchPick = roundPick.matchPicks[0];
					if (!matchPick) return null;

					return {
						user: {
							id: roundPick.user.id,
							displayName: roundPick.user.displayName,
							imageUrl: roundPick.user.imageUrl,
						},
						pick: {
							predictedWinner: matchPick.predictedWinner,
							predictedSetsWon: matchPick.predictedSetsWon,
							predictedSetsLost: matchPick.predictedSetsLost,
							isWinnerCorrect: matchPick.isWinnerCorrect,
							isExactScore: matchPick.isExactScore,
							pointsEarned: matchPick.pointsEarned,
						},
					};
				})
				.filter((p) => p !== null);

			return {
				match: {
					id: match.id,
					matchNumber: match.matchNumber,
					player1Name: match.player1Name,
					player2Name: match.player2Name,
					player1Seed: match.player1Seed,
					player2Seed: match.player2Seed,
					winnerName: match.winnerName,
					finalScore: match.finalScore,
					status: match.status,
					isRetirement: match.isRetirement,
				},
				round: {
					id: match.round.id,
					name: match.round.name,
				},
				tournament: match.round.tournament,
				picks,
			};
		}),

	/**
	 * Get rounds where both current user and another user have submitted picks for a tournament
	 */
	getCommonSubmittedRounds: protectedProcedure
		.input(
			z.object({
				tournamentId: z.number().int(),
				otherUserId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Get all rounds for this tournament
			const tournamentRounds = await ctx.db.query.rounds.findMany({
				where: eq(rounds.tournamentId, input.tournamentId),
				orderBy: [desc(rounds.roundNumber)],
			});

			if (tournamentRounds.length === 0) {
				return [];
			}

			const roundIds = tournamentRounds.map((r) => r.id);

			// Get current user's submitted rounds
			const currentUserRoundPicks = await ctx.db.query.userRoundPicks.findMany({
				where: and(
					eq(userRoundPicks.userId, ctx.user.id),
					inArray(userRoundPicks.roundId, roundIds),
					eq(userRoundPicks.isDraft, false),
				),
				columns: {
					roundId: true,
				},
			});

			// Get other user's submitted rounds
			const otherUserRoundPicks = await ctx.db.query.userRoundPicks.findMany({
				where: and(
					eq(userRoundPicks.userId, input.otherUserId),
					inArray(userRoundPicks.roundId, roundIds),
					eq(userRoundPicks.isDraft, false),
				),
				columns: {
					roundId: true,
				},
			});

			const currentUserRoundIds = new Set(
				currentUserRoundPicks.map((p) => p.roundId),
			);
			const otherUserRoundIds = new Set(
				otherUserRoundPicks.map((p) => p.roundId),
			);

			// Find common rounds
			const commonRounds = tournamentRounds.filter(
				(r) => currentUserRoundIds.has(r.id) && otherUserRoundIds.has(r.id),
			);

			return commonRounds.map((r) => ({
				id: r.id,
				name: r.name,
				roundNumber: r.roundNumber,
				isActive: r.isActive,
				isFinalized: r.isFinalized,
			}));
		}),
});
