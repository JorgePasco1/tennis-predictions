import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
	matches,
	rounds,
	tournaments,
	userRoundPicks,
	users,
} from "~/server/db/schema";
import { getScoringForRound } from "~/server/utils/scoring-config";

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

			// Get all rounds for this tournament with their matches
			const tournamentRounds = await ctx.db.query.rounds.findMany({
				where: eq(rounds.tournamentId, input.tournamentId),
				with: {
					matches: {
						where: isNull(matches.deletedAt),
					},
				},
				orderBy: [rounds.roundNumber],
			});

			const roundIds = tournamentRounds.map((r) => r.id);

			if (roundIds.length === 0) {
				return {
					entries: [],
					currentUserSubmittedRoundIds: [],
					tournamentStats: {
						totalMatches: 0,
						finalizedMatches: 0,
						maxPossiblePoints: 0,
						rounds: [],
					},
				};
			}

			// Calculate tournament statistics
			const roundStats = tournamentRounds.map((round) => {
				const totalMatches = round.matches.length;
				const finalizedMatches = round.matches.filter(
					(m) => m.status === "finalized",
				).length;
				const scoring = getScoringForRound(round.name);
				const maxPossiblePoints =
					finalizedMatches *
					(scoring.pointsPerWinner + scoring.pointsExactScore);

				return {
					roundId: round.id,
					roundName: round.name,
					roundNumber: round.roundNumber,
					totalMatches,
					finalizedMatches,
					pointsPerWinner: scoring.pointsPerWinner,
					pointsExactScore: scoring.pointsExactScore,
					maxPossiblePoints,
				};
			});

			const tournamentStats = {
				totalMatches: roundStats.reduce((sum, r) => sum + r.totalMatches, 0),
				finalizedMatches: roundStats.reduce(
					(sum, r) => sum + r.finalizedMatches,
					0,
				),
				maxPossiblePoints: roundStats.reduce(
					(sum, r) => sum + r.maxPossiblePoints,
					0,
				),
				rounds: roundStats,
			};

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
				tournamentStats,
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
	 * Get per-round leaderboard breakdown
	 * Returns round-by-round statistics and rankings for chart/table visualization
	 */
	getPerRoundLeaderboard: protectedProcedure
		.input(
			z.object({
				tournamentId: z.number().int(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// 1. Get all rounds for tournament with their scoring info
			const tournamentRounds = await ctx.db.query.rounds.findMany({
				where: eq(rounds.tournamentId, input.tournamentId),
				with: {
					matches: {
						where: isNull(matches.deletedAt),
					},
				},
				orderBy: [asc(rounds.roundNumber)],
			});

			if (tournamentRounds.length === 0) {
				return {
					rounds: [],
					userRoundData: [],
				};
			}

			const roundIds = tournamentRounds.map((r) => r.id);

			// Build rounds metadata
			const roundsMetadata = tournamentRounds.map((round) => {
				const scoring = getScoringForRound(round.name);
				const finalizedMatches = round.matches.filter(
					(m) => m.status === "finalized",
				).length;

				return {
					roundId: round.id,
					roundName: round.name,
					roundNumber: round.roundNumber,
					pointsPerWinner: scoring.pointsPerWinner,
					pointsExactScore: scoring.pointsExactScore,
					totalMatches: round.matches.length,
					finalizedMatches,
					isFinalized: round.isFinalized,
				};
			});

			// 2. Get all user round picks (non-draft) for these rounds
			const allUserRoundPicks = await ctx.db
				.select({
					userId: userRoundPicks.userId,
					displayName: users.displayName,
					imageUrl: users.imageUrl,
					roundId: userRoundPicks.roundId,
					totalPoints: userRoundPicks.totalPoints,
					correctWinners: userRoundPicks.correctWinners,
					exactScores: userRoundPicks.exactScores,
					submittedAt: userRoundPicks.submittedAt,
				})
				.from(userRoundPicks)
				.innerJoin(users, eq(userRoundPicks.userId, users.id))
				.where(
					and(
						sql`${userRoundPicks.roundId} IN ${sql.raw(`(${roundIds.join(",")})`)}`,
						eq(userRoundPicks.isDraft, false),
					),
				)
				.orderBy(asc(userRoundPicks.submittedAt));

			if (allUserRoundPicks.length === 0) {
				return {
					rounds: roundsMetadata,
					userRoundData: [],
				};
			}

			// 3. Group picks by user
			const userPicksMap = new Map<
				string,
				{
					userId: string;
					displayName: string;
					imageUrl: string | null;
					picks: Array<{
						roundId: number;
						totalPoints: number;
						correctWinners: number;
						exactScores: number;
						submittedAt: Date;
					}>;
				}
			>();

			for (const pick of allUserRoundPicks) {
				if (!userPicksMap.has(pick.userId)) {
					userPicksMap.set(pick.userId, {
						userId: pick.userId,
						displayName: pick.displayName,
						imageUrl: pick.imageUrl,
						picks: [],
					});
				}
				userPicksMap.get(pick.userId)!.picks.push({
					roundId: pick.roundId,
					totalPoints: pick.totalPoints,
					correctWinners: pick.correctWinners,
					exactScores: pick.exactScores,
					submittedAt: pick.submittedAt,
				});
			}

			// 4. Calculate cumulative points and rankings
			const userRoundData = Array.from(userPicksMap.values()).map((user) => {
				const picksByRound = new Map(user.picks.map((p) => [p.roundId, p]));

				let cumulativePoints = 0;
				const rounds = tournamentRounds.map((round) => {
					const pick = picksByRound.get(round.id);

					if (pick) {
						cumulativePoints += pick.totalPoints;
					}

					return {
						roundId: round.id,
						roundNumber: round.roundNumber,
						roundName: round.name,
						totalPoints: pick?.totalPoints ?? 0,
						correctWinners: pick?.correctWinners ?? 0,
						exactScores: pick?.exactScores ?? 0,
						submittedAt: pick?.submittedAt ?? null,
						cumulativePoints,
						hasSubmitted: !!pick,
						rank: null as number | null,
						cumulativeRank: null as number | null,
					};
				});

				const totalPoints = cumulativePoints;

				return {
					userId: user.userId,
					displayName: user.displayName,
					imageUrl: user.imageUrl,
					rounds,
					totalPoints,
				};
			});

			// 5. Calculate per-round rankings
			// For each round, rank users based on cumulative points up to that round
			for (let i = 0; i < tournamentRounds.length; i++) {
				const roundNumber = tournamentRounds[i]!.roundNumber;

				// Get all users' cumulative points at this round
				const userPointsAtRound = userRoundData
					.map((user) => ({
						userId: user.userId,
						cumulativePoints: user.rounds[i]!.cumulativePoints,
						earliestSubmission: user.rounds
							.slice(0, i + 1)
							.find((r) => r.submittedAt)?.submittedAt,
						hasSubmitted: user.rounds[i]!.hasSubmitted,
					}))
					.filter((u) => u.hasSubmitted)
					.sort((a, b) => {
						if (b.cumulativePoints !== a.cumulativePoints) {
							return b.cumulativePoints - a.cumulativePoints;
						}
						// Tiebreaker: earliest submission
						if (a.earliestSubmission && b.earliestSubmission) {
							return (
								a.earliestSubmission.getTime() - b.earliestSubmission.getTime()
							);
						}
						return 0;
					});

				// Assign ranks
				const rankMap = new Map<string, number>();
				for (let j = 0; j < userPointsAtRound.length; j++) {
					rankMap.set(userPointsAtRound[j]!.userId, j + 1);
				}

				// Add rank to each user's round data
				for (const user of userRoundData) {
					const round = user.rounds[i]!;
					round.cumulativeRank = rankMap.get(user.userId) ?? null;
				}
			}

			// 6. Calculate final rankings and per-round rankings
			const finalRankings = userRoundData
				.sort((a, b) => {
					if (b.totalPoints !== a.totalPoints) {
						return b.totalPoints - a.totalPoints;
					}
					// Tiebreaker: earliest submission
					const aFirst = a.rounds.find((r) => r.submittedAt)?.submittedAt;
					const bFirst = b.rounds.find((r) => r.submittedAt)?.submittedAt;
					if (aFirst && bFirst) {
						return aFirst.getTime() - bFirst.getTime();
					}
					return 0;
				})
				.map((user, index) => ({
					...user,
					finalRank: index + 1,
				}));

			// Calculate per-round rankings (who won each round)
			for (let i = 0; i < tournamentRounds.length; i++) {
				const roundId = tournamentRounds[i]!.id;

				const roundRankings = finalRankings
					.map((user) => ({
						userId: user.userId,
						roundPoints: user.rounds[i]!.totalPoints,
						submittedAt: user.rounds[i]!.submittedAt,
					}))
					.filter((u) => u.submittedAt !== null)
					.sort((a, b) => {
						if (b.roundPoints !== a.roundPoints) {
							return b.roundPoints - a.roundPoints;
						}
						if (a.submittedAt && b.submittedAt) {
							return a.submittedAt.getTime() - b.submittedAt.getTime();
						}
						return 0;
					});

				const roundRankMap = new Map<string, number>();
				for (let j = 0; j < roundRankings.length; j++) {
					roundRankMap.set(roundRankings[j]!.userId, j + 1);
				}

				for (const user of finalRankings) {
					const round = user.rounds[i]!;
					round.rank = roundRankMap.get(user.userId) ?? null;
				}
			}

			return {
				rounds: roundsMetadata,
				userRoundData: finalRankings,
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
		// Count only finalized matches (where isWinnerCorrect is not null)
		const totalFinalizedPredictions = userPicks.reduce(
			(sum, p) =>
				sum + p.matchPicks.filter((mp) => mp.isWinnerCorrect !== null).length,
			0,
		);
		const totalPredictions = userPicks.reduce(
			(sum, p) => sum + p.matchPicks.length,
			0,
		);

		const accuracy =
			totalFinalizedPredictions > 0
				? (totalCorrectWinners / totalFinalizedPredictions) * 100
				: 0;
		const exactScoreRate =
			totalFinalizedPredictions > 0
				? (totalExactScores / totalFinalizedPredictions) * 100
				: 0;

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
				finalizedPredictions: number;
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
					finalizedPredictions: 0,
				});
			}
			const t = tournamentMap.get(tid)!;
			t.points += pick.totalPoints;
			t.correctWinners += pick.correctWinners;
			t.exactScores += pick.exactScores;
			t.roundsPlayed += 1;
			t.predictions += pick.matchPicks.length;
			t.finalizedPredictions += pick.matchPicks.filter(
				(mp) => mp.isWinnerCorrect !== null,
			).length;
		}

		const tournamentsList = Array.from(tournamentMap.values())
			.map((t) => ({
				...t,
				accuracy:
					t.finalizedPredictions > 0
						? (t.correctWinners / t.finalizedPredictions) * 100
						: 0,
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
