import { z } from "zod";
import { eq, and, isNull, sql, desc, asc } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
	tournaments,
	rounds,
	userRoundPicks,
	users,
} from "~/server/db/schema";

export const leaderboardsRouter = createTRPCRouter({
	/**
	 * Get tournament-specific leaderboard
	 */
	getTournamentLeaderboard: protectedProcedure
		.input(
			z.object({
				tournamentId: z.number().int(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Verify tournament exists
			const tournament = await ctx.db.query.tournaments.findFirst({
				where: and(
					eq(tournaments.id, input.tournamentId),
					isNull(tournaments.deletedAt),
				),
			});

			if (!tournament) {
				throw new Error("Tournament not found");
			}

			// Get all rounds for this tournament
			const tournamentRounds = await ctx.db.query.rounds.findMany({
				where: eq(rounds.tournamentId, input.tournamentId),
			});

			const roundIds = tournamentRounds.map((r) => r.id);

			if (roundIds.length === 0) {
				return [];
			}

			// Build the leaderboard query
			// Group by user, sum total points, get earliest submission time
			const leaderboard = await ctx.db
				.select({
					userId: userRoundPicks.userId,
					displayName: users.displayName,
					email: users.email,
					totalPoints: sql<number>`SUM(${userRoundPicks.totalPoints})`,
					correctWinners: sql<number>`SUM(${userRoundPicks.correctWinners})`,
					exactScores: sql<number>`SUM(${userRoundPicks.exactScores})`,
					roundsPlayed: sql<number>`COUNT(DISTINCT ${userRoundPicks.roundId})`,
					earliestSubmission: sql<Date>`MIN(${userRoundPicks.submittedAt})`,
				})
				.from(userRoundPicks)
				.innerJoin(users, eq(userRoundPicks.userId, users.id))
				.where(
					sql`${userRoundPicks.roundId} IN ${sql.raw(`(${roundIds.join(",")})`)}`,
				)
				.groupBy(userRoundPicks.userId, users.displayName, users.email)
				.orderBy(
					desc(sql`SUM(${userRoundPicks.totalPoints})`),
					asc(sql`MIN(${userRoundPicks.submittedAt})`),
				);

			// Add rank to each entry
			return leaderboard.map((entry, index) => ({
				...entry,
				rank: index + 1,
			}));
		}),

	/**
	 * Get all-time leaderboard across all tournaments
	 */
	getAllTimeLeaderboard: protectedProcedure.query(async ({ ctx }) => {
		// Get all non-deleted tournaments
		const allTournaments = await ctx.db.query.tournaments.findMany({
			where: isNull(tournaments.deletedAt),
		});

		const tournamentIds = allTournaments.map((t) => t.id);

		if (tournamentIds.length === 0) {
			return [];
		}

		// Get all rounds for all tournaments
		const allRounds = await ctx.db
			.select({ id: rounds.id })
			.from(rounds)
			.where(
				sql`${rounds.tournamentId} IN ${sql.raw(`(${tournamentIds.join(",")})`)}`,
			);

		const roundIds = allRounds.map((r) => r.id);

		if (roundIds.length === 0) {
			return [];
		}

		// Build the all-time leaderboard
		const leaderboard = await ctx.db
			.select({
				userId: userRoundPicks.userId,
				displayName: users.displayName,
				email: users.email,
				totalPoints: sql<number>`SUM(${userRoundPicks.totalPoints})`,
				correctWinners: sql<number>`SUM(${userRoundPicks.correctWinners})`,
				exactScores: sql<number>`SUM(${userRoundPicks.exactScores})`,
				roundsPlayed: sql<number>`COUNT(DISTINCT ${userRoundPicks.roundId})`,
				tournamentsPlayed: sql<number>`COUNT(DISTINCT (
          SELECT tournament_id
          FROM round
          WHERE id = ${userRoundPicks.roundId}
        ))`,
				memberSince: users.createdAt,
				earliestSubmission: sql<Date>`MIN(${userRoundPicks.submittedAt})`,
			})
			.from(userRoundPicks)
			.innerJoin(users, eq(userRoundPicks.userId, users.id))
			.where(
				sql`${userRoundPicks.roundId} IN ${sql.raw(`(${roundIds.join(",")})`)}`,
			)
			.groupBy(userRoundPicks.userId, users.displayName, users.email, users.createdAt)
			.orderBy(
				desc(sql`SUM(${userRoundPicks.totalPoints})`),
				asc(users.createdAt),
				asc(sql`MIN(${userRoundPicks.submittedAt})`),
			);

		// Add rank to each entry
		return leaderboard.map((entry, index) => ({
			...entry,
			rank: index + 1,
		}));
	}),

	/**
	 * Get user's rank and stats in a tournament
	 */
	getUserTournamentStats: protectedProcedure
		.input(
			z.object({
				tournamentId: z.number().int(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Get the full leaderboard
			const leaderboard = await ctx.db
				.select({
					userId: userRoundPicks.userId,
					totalPoints: sql<number>`SUM(${userRoundPicks.totalPoints})`,
					earliestSubmission: sql<Date>`MIN(${userRoundPicks.submittedAt})`,
				})
				.from(userRoundPicks)
				.innerJoin(rounds, eq(userRoundPicks.roundId, rounds.id))
				.where(
					and(
						eq(rounds.tournamentId, input.tournamentId),
						isNull(tournaments.deletedAt),
					),
				)
				.groupBy(userRoundPicks.userId)
				.orderBy(
					desc(sql`SUM(${userRoundPicks.totalPoints})`),
					asc(sql`MIN(${userRoundPicks.submittedAt})`),
				);

			// Find user's position
			const userIndex = leaderboard.findIndex(
				(entry) => entry.userId === ctx.user.id,
			);

			if (userIndex === -1) {
				return null;
			}

			return {
				rank: userIndex + 1,
				totalParticipants: leaderboard.length,
				...leaderboard[userIndex],
			};
		}),
});
