import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
	matchPicks,
	rounds,
	tournaments,
	userRoundPicks,
	users,
} from "~/server/db/schema";

export const leaderboardsRouter = createTRPCRouter({
	/**
	 * Get tournament-specific leaderboard
	 * Returns leaderboard entries and the current user's submission status
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
				return {
					entries: [],
					currentUserSubmittedRoundIds: [],
				};
			}

			// Get rounds where current user has submitted (non-draft) picks
			const currentUserSubmissions = await ctx.db.query.userRoundPicks.findMany(
				{
					where: and(
						eq(userRoundPicks.userId, ctx.user.id),
						inArray(userRoundPicks.roundId, roundIds),
						eq(userRoundPicks.isDraft, false),
					),
					columns: {
						roundId: true,
					},
				},
			);

			const currentUserSubmittedRoundIds = currentUserSubmissions.map(
				(s) => s.roundId,
			);

			// Build the leaderboard query
			// Group by user, sum total points, get earliest submission time
			const leaderboard = await ctx.db
				.select({
					userId: userRoundPicks.userId,
					displayName: users.displayName,
					imageUrl: users.imageUrl,
					totalPoints: sql<number>`SUM(${userRoundPicks.totalPoints})`,
					correctWinners: sql<number>`SUM(${userRoundPicks.correctWinners})`,
					exactScores: sql<number>`SUM(${userRoundPicks.exactScores})`,
					roundsPlayed: sql<number>`COUNT(DISTINCT ${userRoundPicks.roundId})`,
					earliestSubmission: sql<Date>`MIN(${userRoundPicks.submittedAt})`,
				})
				.from(userRoundPicks)
				.innerJoin(users, eq(userRoundPicks.userId, users.id))
				.where(
					and(
						sql`${userRoundPicks.roundId} IN ${sql.raw(`(${roundIds.join(",")})`)}`,
						eq(userRoundPicks.isDraft, false),
					),
				)
				.groupBy(userRoundPicks.userId, users.displayName, users.imageUrl)
				.orderBy(
					desc(sql`SUM(${userRoundPicks.totalPoints})`),
					asc(sql`MIN(${userRoundPicks.submittedAt})`),
				);

			// Add rank to each entry
			const entries = leaderboard.map((entry, index) => ({
				...entry,
				rank: index + 1,
			}));

			return {
				entries,
				currentUserSubmittedRoundIds,
			};
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

		// Get active tournaments for displaying links
		const activeTournaments = allTournaments
			.filter((t) => t.status === "active")
			.map((t) => ({
				id: t.id,
				name: t.name,
				year: t.year,
				slug: t.slug,
			}))
			.sort((a, b) => b.year - a.year || a.name.localeCompare(b.name));

		if (tournamentIds.length === 0) {
			return { leaderboard: [], activeTournaments };
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
			return { leaderboard: [], activeTournaments };
		}

		// Build the all-time leaderboard
		const leaderboard = await ctx.db
			.select({
				userId: userRoundPicks.userId,
				displayName: users.displayName,
				imageUrl: users.imageUrl,
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
				and(
					sql`${userRoundPicks.roundId} IN ${sql.raw(`(${roundIds.join(",")})`)}`,
					eq(userRoundPicks.isDraft, false),
				),
			)
			.groupBy(
				userRoundPicks.userId,
				users.displayName,
				users.imageUrl,
				users.createdAt,
			)
			.orderBy(
				desc(sql`SUM(${userRoundPicks.totalPoints})`),
				asc(users.createdAt),
				asc(sql`MIN(${userRoundPicks.submittedAt})`),
			);

		// Add rank to each entry
		const rankedLeaderboard = leaderboard.map((entry, index) => ({
			...entry,
			rank: index + 1,
		}));

		return {
			leaderboard: rankedLeaderboard,
			activeTournaments,
		};
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

	/**
	 * Get comprehensive stats for the current user
	 */
	getUserStats: protectedProcedure.query(async ({ ctx }) => {
		// Get all user's round picks with tournament context (only final submissions)
		const userPicks = await ctx.db.query.userRoundPicks.findMany({
			where: and(
				eq(userRoundPicks.userId, ctx.user.id),
				eq(userRoundPicks.isDraft, false),
			),
			with: {
				round: {
					with: {
						tournament: true,
					},
				},
				matchPicks: true,
			},
			orderBy: [desc(userRoundPicks.submittedAt)],
		});

		// Calculate overall stats
		const totalPoints = userPicks.reduce((sum, p) => sum + p.totalPoints, 0);
		const totalCorrectWinners = userPicks.reduce(
			(sum, p) => sum + p.correctWinners,
			0,
		);
		const totalExactScores = userPicks.reduce(
			(sum, p) => sum + p.exactScores,
			0,
		);
		const totalPredictions = userPicks.reduce(
			(sum, p) => sum + p.matchPicks.length,
			0,
		);

		const accuracy =
			totalPredictions > 0 ? (totalCorrectWinners / totalPredictions) * 100 : 0;
		const exactScoreRate =
			totalPredictions > 0 ? (totalExactScores / totalPredictions) * 100 : 0;

		// Get rank from all-time leaderboard
		const allTimeLeaderboard = await ctx.db
			.select({
				odUserId: userRoundPicks.userId,
				odTotalPoints: sql<number>`SUM(${userRoundPicks.totalPoints})`,
			})
			.from(userRoundPicks)
			.where(eq(userRoundPicks.isDraft, false))
			.groupBy(userRoundPicks.userId)
			.orderBy(desc(sql`SUM(${userRoundPicks.totalPoints})`));

		const userRank =
			allTimeLeaderboard.findIndex((u) => u.odUserId === ctx.user.id) + 1;

		// Group by tournament
		const tournamentMap = new Map<
			number,
			{
				tournamentId: number;
				tournamentName: string;
				tournamentYear: number;
				points: number;
				correctWinners: number;
				exactScores: number;
				roundsPlayed: number;
				predictions: number;
			}
		>();

		for (const pick of userPicks) {
			const tid = pick.round.tournament.id;
			if (!tournamentMap.has(tid)) {
				tournamentMap.set(tid, {
					tournamentId: tid,
					tournamentName: pick.round.tournament.name,
					tournamentYear: pick.round.tournament.year,
					points: 0,
					correctWinners: 0,
					exactScores: 0,
					roundsPlayed: 0,
					predictions: 0,
				});
			}
			const t = tournamentMap.get(tid)!;
			t.points += pick.totalPoints;
			t.correctWinners += pick.correctWinners;
			t.exactScores += pick.exactScores;
			t.roundsPlayed += 1;
			t.predictions += pick.matchPicks.length;
		}

		const tournamentsList = Array.from(tournamentMap.values())
			.map((t) => ({
				...t,
				accuracy:
					t.predictions > 0 ? (t.correctWinners / t.predictions) * 100 : 0,
			}))
			.sort((a, b) => b.points - a.points);

		return {
			overall: {
				totalPoints,
				totalCorrectWinners,
				totalExactScores,
				totalPredictions,
				accuracy,
				exactScoreRate,
				rank: userRank || null,
				totalPlayers: allTimeLeaderboard.length,
				tournamentsPlayed: tournamentsList.length,
				roundsPlayed: userPicks.length,
			},
			tournaments: tournamentsList,
			bestTournament: tournamentsList[0] ?? null,
			recentActivity: userPicks.slice(0, 5).map((p) => ({
				roundName: p.round.name,
				tournamentName: p.round.tournament.name,
				tournamentYear: p.round.tournament.year,
				totalPoints: p.totalPoints,
				correctWinners: p.correctWinners,
				exactScores: p.exactScores,
				submittedAt: p.submittedAt,
			})),
		};
	}),
});
