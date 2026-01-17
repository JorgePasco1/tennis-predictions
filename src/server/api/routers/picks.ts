import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
	rounds,
	matches,
	userRoundPicks,
	matchPicks,
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

			if (existingPicks) {
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

				// Validate sets
				if (pick.predictedSetsWon < 2) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Winner must have won at least 2 sets",
					});
				}
				if (pick.predictedSetsLost >= pick.predictedSetsWon) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Winner must have won more sets than they lost",
					});
				}
				if (pick.predictedSetsWon === 2 && pick.predictedSetsLost > 1) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message:
							"Invalid score: if sets won is 2, sets lost must be 0 or 1",
					});
				}
				if (pick.predictedSetsWon === 3 && pick.predictedSetsLost !== 2) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message:
							"Invalid score: if sets won is 3, sets lost must be 2",
					});
				}
			}

			// Create user round pick and all match picks in a transaction
			return await ctx.db.transaction(async (tx) => {
				// Create the user round pick
				const [userRoundPick] = await tx
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

				if (!userRoundPick) {
					throw new Error("Failed to create user round pick");
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
});
