import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
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
					role: ctx.user.role,
				})
				.onConflictDoUpdate({
					target: users.clerkId,
					set: {
						email: ctx.user.email,
						displayName: ctx.user.displayName,
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
					role: ctx.user.role,
				})
				.onConflictDoUpdate({
					target: users.clerkId,
					set: {
						email: ctx.user.email,
						displayName: ctx.user.displayName,
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
});
