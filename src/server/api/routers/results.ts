import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { rounds, matches, matchPicks, userRoundPicks } from "~/server/db/schema";

export const resultsRouter = createTRPCRouter({
	/**
	 * Get all match results for a round
	 */
	getMatchResults: protectedProcedure
		.input(
			z.object({
				roundId: z.number().int(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const round = await ctx.db.query.rounds.findFirst({
				where: eq(rounds.id, input.roundId),
				with: {
					tournament: true,
					matches: {
						where: isNull(matches.deletedAt),
						orderBy: [matches.matchNumber],
						with: {
							finalizedByUser: {
								columns: {
									displayName: true,
								},
							},
						},
					},
				},
			});

			if (!round) {
				throw new Error("Round not found");
			}

			return round;
		}),

	/**
	 * Get match results with user's picks
	 */
	getMatchResultsWithUserPicks: protectedProcedure
		.input(
			z.object({
				roundId: z.number().int(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Get the round with all matches
			const round = await ctx.db.query.rounds.findFirst({
				where: eq(rounds.id, input.roundId),
				with: {
					tournament: true,
					matches: {
						where: isNull(matches.deletedAt),
						orderBy: [matches.matchNumber],
					},
				},
			});

			if (!round) {
				throw new Error("Round not found");
			}

			// Get user's picks for this round
			const userPick = await ctx.db.query.userRoundPicks.findFirst({
				where: and(
					eq(userRoundPicks.userId, ctx.user.id),
					eq(userRoundPicks.roundId, input.roundId),
				),
				with: {
					matchPicks: true,
				},
			});

			// Map matches with user's picks
			const matchesWithPicks = round.matches.map((match) => {
				const userMatchPick = userPick?.matchPicks.find(
					(pick) => pick.matchId === match.id,
				);

				return {
					...match,
					userPick: userMatchPick ?? null,
				};
			});

			return {
				round,
				matches: matchesWithPicks,
				userRoundPick: userPick ?? null,
			};
		}),

	/**
	 * Get all results for a tournament with user's picks
	 */
	getTournamentResultsWithUserPicks: protectedProcedure
		.input(
			z.object({
				tournamentId: z.number().int(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Get all rounds for the tournament
			const tournamentRounds = await ctx.db.query.rounds.findMany({
				where: eq(rounds.tournamentId, input.tournamentId),
				orderBy: [rounds.roundNumber],
				with: {
					matches: {
						where: isNull(matches.deletedAt),
						orderBy: [matches.matchNumber],
					},
					scoringRule: true,
				},
			});

			// Get all user picks for this tournament
			const roundIds = tournamentRounds.map((r) => r.id);
			const userPicks = await ctx.db.query.userRoundPicks.findMany({
				where: and(
					eq(userRoundPicks.userId, ctx.user.id),
					// @ts-expect-error - inArray type issue
					eq(userRoundPicks.roundId, roundIds),
				),
				with: {
					matchPicks: true,
				},
			});

			// Map rounds with matches and user picks
			const roundsWithPicks = tournamentRounds.map((round) => {
				const userRoundPick = userPicks.find((p) => p.roundId === round.id);

				const matchesWithPicks = round.matches.map((match) => {
					const userMatchPick = userRoundPick?.matchPicks.find(
						(pick) => pick.matchId === match.id,
					);

					return {
						...match,
						userPick: userMatchPick ?? null,
					};
				});

				return {
					...round,
					matches: matchesWithPicks,
					userRoundPick: userRoundPick ?? null,
				};
			});

			return roundsWithPicks;
		}),
});
