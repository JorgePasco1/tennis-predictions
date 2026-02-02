import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
	matches,
	matchPicks,
	rounds,
	tournaments,
	userAchievements,
	userRoundPicks,
	userStreaks,
	users,
} from "~/server/db/schema";

export const summaryRouter = createTRPCRouter({
	/**
	 * Get comprehensive tournament summary for display after tournament closes
	 * Includes podium (top 3), top performers, creative stats, round winners, and overview
	 */
	getTournamentSummary: protectedProcedure
		.input(
			z.object({
				tournamentId: z.number().int(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Verify tournament exists and is closed
			const tournament = await ctx.db.query.tournaments.findFirst({
				where: and(
					eq(tournaments.id, input.tournamentId),
					isNull(tournaments.deletedAt),
				),
			});

			if (!tournament) {
				throw new Error("Tournament not found");
			}

			if (!tournament.closedAt) {
				throw new Error(
					"Tournament summary is only available after the tournament is closed",
				);
			}

			// Get all rounds for this tournament
			const tournamentRounds = await ctx.db.query.rounds.findMany({
				where: eq(rounds.tournamentId, input.tournamentId),
				with: {
					matches: {
						where: isNull(matches.deletedAt),
					},
				},
				orderBy: [asc(rounds.roundNumber)],
			});

			const roundIds = tournamentRounds.map((r) => r.id);

			if (roundIds.length === 0) {
				return {
					tournament: {
						id: tournament.id,
						name: tournament.name,
						year: tournament.year,
						closedAt: tournament.closedAt,
					},
					podium: [],
					topPerformers: null,
					creativeStats: null,
					roundWinners: [],
					overview: {
						totalParticipants: 0,
						totalPredictions: 0,
						totalMatches: 0,
						finalizedMatches: 0,
						averageAccuracy: 0,
						upsetRate: 0,
					},
				};
			}

			// ========================================
			// PODIUM - Top 3 users with points
			// ========================================
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
						inArray(userRoundPicks.roundId, roundIds),
						eq(userRoundPicks.isDraft, false),
					),
				)
				.groupBy(userRoundPicks.userId, users.displayName, users.imageUrl)
				.orderBy(
					desc(sql`SUM(${userRoundPicks.totalPoints})`),
					asc(sql`MIN(${userRoundPicks.submittedAt})`),
				);

			// Build podium with margins
			const podium = leaderboard.slice(0, 3).map((entry, index) => ({
				rank: index + 1,
				userId: entry.userId,
				displayName: entry.displayName,
				imageUrl: entry.imageUrl,
				totalPoints: entry.totalPoints,
				correctWinners: entry.correctWinners,
				exactScores: entry.exactScores,
				roundsPlayed: entry.roundsPlayed,
				marginFromPrevious:
					index > 0
						? (leaderboard[index - 1]?.totalPoints ?? 0) - entry.totalPoints
						: 0,
			}));

			if (leaderboard.length === 0) {
				return {
					tournament: {
						id: tournament.id,
						name: tournament.name,
						year: tournament.year,
						closedAt: tournament.closedAt,
					},
					podium: [],
					topPerformers: null,
					creativeStats: null,
					roundWinners: [],
					overview: {
						totalParticipants: 0,
						totalPredictions: 0,
						totalMatches: tournamentRounds.reduce(
							(sum, r) => sum + r.matches.length,
							0,
						),
						finalizedMatches: tournamentRounds.reduce(
							(sum, r) =>
								sum + r.matches.filter((m) => m.status === "finalized").length,
							0,
						),
						averageAccuracy: 0,
						upsetRate: 0,
					},
				};
			}

			// ========================================
			// TOP PERFORMERS
			// ========================================

			// Most exact scores
			const mostExactScores = leaderboard
				.slice()
				.sort((a, b) => b.exactScores - a.exactScores)[0];

			// Get all user round picks for per-round calculations
			const allUserRoundPicks = await ctx.db
				.select({
					userId: userRoundPicks.userId,
					displayName: users.displayName,
					imageUrl: users.imageUrl,
					roundId: userRoundPicks.roundId,
					totalPoints: userRoundPicks.totalPoints,
					correctWinners: userRoundPicks.correctWinners,
					exactScores: userRoundPicks.exactScores,
				})
				.from(userRoundPicks)
				.innerJoin(users, eq(userRoundPicks.userId, users.id))
				.where(
					and(
						inArray(userRoundPicks.roundId, roundIds),
						eq(userRoundPicks.isDraft, false),
					),
				);

			// Best single round accuracy
			// First, count matches per round
			const matchesPerRound = new Map<number, number>();
			for (const round of tournamentRounds) {
				const finalizedCount = round.matches.filter(
					(m) => m.status === "finalized",
				).length;
				matchesPerRound.set(round.id, finalizedCount);
			}

			// Find the best round accuracy
			let bestRoundAccuracy: {
				userId: string;
				displayName: string;
				imageUrl: string | null;
				roundName: string;
				accuracy: number;
				correctWinners: number;
				totalMatches: number;
			} | null = null;

			for (const pick of allUserRoundPicks) {
				const totalMatches = matchesPerRound.get(pick.roundId) ?? 0;
				if (totalMatches === 0) continue;

				const accuracy = (pick.correctWinners / totalMatches) * 100;
				const round = tournamentRounds.find((r) => r.id === pick.roundId);

				if (
					!bestRoundAccuracy ||
					accuracy > bestRoundAccuracy.accuracy ||
					(accuracy === bestRoundAccuracy.accuracy &&
						pick.correctWinners > bestRoundAccuracy.correctWinners)
				) {
					bestRoundAccuracy = {
						userId: pick.userId,
						displayName: pick.displayName,
						imageUrl: pick.imageUrl,
						roundName: round?.name ?? "Unknown Round",
						accuracy,
						correctWinners: pick.correctWinners,
						totalMatches,
					};
				}
			}

			// Most consistent (lowest variance in points across rounds)
			// Group picks by user
			const userPicksMap = new Map<
				string,
				{ displayName: string; imageUrl: string | null; points: number[] }
			>();
			for (const pick of allUserRoundPicks) {
				if (!userPicksMap.has(pick.userId)) {
					userPicksMap.set(pick.userId, {
						displayName: pick.displayName,
						imageUrl: pick.imageUrl,
						points: [],
					});
				}
				userPicksMap.get(pick.userId)?.points.push(pick.totalPoints);
			}

			// Calculate variance for each user (only if they played multiple rounds)
			let mostConsistent: {
				userId: string;
				displayName: string;
				imageUrl: string | null;
				variance: number;
				roundsPlayed: number;
				averagePoints: number;
			} | null = null;

			for (const [userId, data] of userPicksMap) {
				if (data.points.length < 2) continue;

				const mean =
					data.points.reduce((a, b) => a + b, 0) / data.points.length;
				const variance =
					data.points.reduce((sum, p) => sum + (p - mean) ** 2, 0) /
					data.points.length;

				if (
					!mostConsistent ||
					variance < mostConsistent.variance ||
					(variance === mostConsistent.variance &&
						data.points.length > mostConsistent.roundsPlayed)
				) {
					mostConsistent = {
						userId,
						displayName: data.displayName,
						imageUrl: data.imageUrl,
						variance,
						roundsPlayed: data.points.length,
						averagePoints: mean,
					};
				}
			}

			// Longest streak - get from userStreaks table
			const longestStreakResult = await ctx.db
				.select({
					userId: userStreaks.userId,
					displayName: users.displayName,
					imageUrl: users.imageUrl,
					longestStreak: userStreaks.longestStreak,
				})
				.from(userStreaks)
				.innerJoin(users, eq(userStreaks.userId, users.id))
				.where(
					inArray(
						userStreaks.userId,
						leaderboard.map((l) => l.userId),
					),
				)
				.orderBy(desc(userStreaks.longestStreak))
				.limit(1);

			const longestStreak = longestStreakResult[0] ?? null;

			// ========================================
			// CREATIVE STATS
			// ========================================

			// Get all finalized matches with seed info
			const allMatches = tournamentRounds.flatMap((r) =>
				r.matches.filter((m) => m.status === "finalized"),
			);
			const matchIds = allMatches.map((m) => m.id);

			// Get all match picks for these matches
			let allMatchPicks: Array<{
				userId: string;
				displayName: string;
				imageUrl: string | null;
				matchId: number;
				predictedWinner: string;
				isWinnerCorrect: boolean | null;
			}> = [];

			if (matchIds.length > 0) {
				allMatchPicks = await ctx.db
					.select({
						userId: userRoundPicks.userId,
						displayName: users.displayName,
						imageUrl: users.imageUrl,
						matchId: matchPicks.matchId,
						predictedWinner: matchPicks.predictedWinner,
						isWinnerCorrect: matchPicks.isWinnerCorrect,
					})
					.from(matchPicks)
					.innerJoin(
						userRoundPicks,
						eq(matchPicks.userRoundPickId, userRoundPicks.id),
					)
					.innerJoin(users, eq(userRoundPicks.userId, users.id))
					.where(
						and(
							inArray(matchPicks.matchId, matchIds),
							eq(userRoundPicks.isDraft, false),
						),
					);
			}

			// Identify upsets (where higher seed beat lower seed)
			// In tennis, lower seed number = better player, so upset = higher seed wins
			const upsetMatches = allMatches.filter((m) => {
				if (!m.winnerName || !m.player1Seed || !m.player2Seed) return false;

				const player1IsWinner = m.winnerName === m.player1Name;
				const player1HasHigherSeed = m.player1Seed > m.player2Seed;

				// Upset if the higher seeded player (worse ranking) won
				return player1IsWinner ? player1HasHigherSeed : !player1HasHigherSeed;
			});

			const upsetMatchIds = new Set(upsetMatches.map((m) => m.id));

			// Upset Callers - users who correctly predicted the most upsets
			const userUpsetCalls = new Map<
				string,
				{ displayName: string; imageUrl: string | null; count: number }
			>();
			for (const pick of allMatchPicks) {
				if (upsetMatchIds.has(pick.matchId) && pick.isWinnerCorrect) {
					const existing = userUpsetCalls.get(pick.userId);
					if (existing) {
						existing.count++;
					} else {
						userUpsetCalls.set(pick.userId, {
							displayName: pick.displayName,
							imageUrl: pick.imageUrl,
							count: 1,
						});
					}
				}
			}

			const topUpsetCallers = Array.from(userUpsetCalls.entries())
				.map(([userId, data]) => ({ userId, ...data }))
				.sort((a, b) => b.count - a.count)
				.slice(0, 3);

			// Consensus favorites - most picked players overall
			const playerPickCounts = new Map<string, number>();
			for (const pick of allMatchPicks) {
				const count = playerPickCounts.get(pick.predictedWinner) ?? 0;
				playerPickCounts.set(pick.predictedWinner, count + 1);
			}

			const consensusFavorites = Array.from(playerPickCounts.entries())
				.map(([playerName, pickCount]) => ({ playerName, pickCount }))
				.sort((a, b) => b.pickCount - a.pickCount)
				.slice(0, 5);

			// Closest competition - two users with smallest final point gap
			let closestCompetition: {
				user1: {
					userId: string;
					displayName: string;
					imageUrl: string | null;
					totalPoints: number;
				};
				user2: {
					userId: string;
					displayName: string;
					imageUrl: string | null;
					totalPoints: number;
				};
				pointGap: number;
			} | null = null;

			if (leaderboard.length >= 2) {
				let smallestGap = Number.POSITIVE_INFINITY;
				for (let i = 0; i < leaderboard.length - 1; i++) {
					const user1 = leaderboard[i];
					const user2 = leaderboard[i + 1];
					if (!user1 || !user2) continue;
					const gap = user1.totalPoints - user2.totalPoints;

					if (gap < smallestGap && gap >= 0) {
						smallestGap = gap;
						closestCompetition = {
							user1: {
								userId: user1.userId,
								displayName: user1.displayName,
								imageUrl: user1.imageUrl,
								totalPoints: user1.totalPoints,
							},
							user2: {
								userId: user2.userId,
								displayName: user2.displayName,
								imageUrl: user2.imageUrl,
								totalPoints: user2.totalPoints,
							},
							pointGap: gap,
						};
					}
				}
			}

			// Contrarian winners - users who successfully picked underdogs others ignored
			// Find matches where the pick percentage was low but the user got it right
			const matchPickPercentages = new Map<
				number,
				Map<string, { count: number; total: number }>
			>();
			for (const pick of allMatchPicks) {
				if (!matchPickPercentages.has(pick.matchId)) {
					matchPickPercentages.set(pick.matchId, new Map());
				}
				const playerStats = matchPickPercentages.get(pick.matchId);
				if (!playerStats) continue;
				const existing = playerStats.get(pick.predictedWinner);
				if (existing) {
					existing.count++;
					existing.total++;
				} else {
					playerStats.set(pick.predictedWinner, { count: 1, total: 1 });
				}
			}

			// Calculate total picks per match
			for (const [, players] of matchPickPercentages) {
				const total = Array.from(players.values()).reduce(
					(sum, p) => sum + p.count,
					0,
				);
				for (const stats of players.values()) {
					stats.total = total;
				}
			}

			// Find users who got the most "contrarian" correct picks (< 30% picked their winner)
			const userContrarianWins = new Map<
				string,
				{ displayName: string; imageUrl: string | null; count: number }
			>();
			for (const pick of allMatchPicks) {
				if (!pick.isWinnerCorrect) continue;

				const matchStats = matchPickPercentages.get(pick.matchId);
				if (!matchStats) continue;

				const playerStats = matchStats.get(pick.predictedWinner);
				if (!playerStats || playerStats.total === 0) continue;

				const pickPercentage = (playerStats.count / playerStats.total) * 100;
				if (pickPercentage < 30) {
					const existing = userContrarianWins.get(pick.userId);
					if (existing) {
						existing.count++;
					} else {
						userContrarianWins.set(pick.userId, {
							displayName: pick.displayName,
							imageUrl: pick.imageUrl,
							count: 1,
						});
					}
				}
			}

			const topContrarianWinners = Array.from(userContrarianWins.entries())
				.map(([userId, data]) => ({ userId, ...data }))
				.sort((a, b) => b.count - a.count)
				.slice(0, 3);

			// ========================================
			// ROUND WINNERS
			// ========================================
			const roundWinners: Array<{
				roundId: number;
				roundName: string;
				roundNumber: number;
				winner: {
					userId: string;
					displayName: string;
					imageUrl: string | null;
					totalPoints: number;
				} | null;
			}> = [];

			for (const round of tournamentRounds) {
				const roundPicks = allUserRoundPicks.filter(
					(p) => p.roundId === round.id,
				);
				if (roundPicks.length === 0) {
					roundWinners.push({
						roundId: round.id,
						roundName: round.name,
						roundNumber: round.roundNumber,
						winner: null,
					});
					continue;
				}

				const topPick = roundPicks.sort(
					(a, b) => b.totalPoints - a.totalPoints,
				)[0];

				roundWinners.push({
					roundId: round.id,
					roundName: round.name,
					roundNumber: round.roundNumber,
					winner: topPick
						? {
								userId: topPick.userId,
								displayName: topPick.displayName,
								imageUrl: topPick.imageUrl,
								totalPoints: topPick.totalPoints,
							}
						: null,
				});
			}

			// ========================================
			// TOURNAMENT OVERVIEW
			// ========================================
			const totalMatches = tournamentRounds.reduce(
				(sum, r) => sum + r.matches.length,
				0,
			);
			const finalizedMatches = allMatches.length;
			const totalPredictions = allMatchPicks.length;
			const correctPredictions = allMatchPicks.filter(
				(p) => p.isWinnerCorrect,
			).length;

			const averageAccuracy =
				totalPredictions > 0
					? (correctPredictions / totalPredictions) * 100
					: 0;

			const upsetRate =
				finalizedMatches > 0
					? (upsetMatches.length / finalizedMatches) * 100
					: 0;

			// ========================================
			// ACHIEVEMENTS FOR THIS TOURNAMENT
			// ========================================
			const tournamentAchievements =
				await ctx.db.query.userAchievements.findMany({
					where: eq(userAchievements.tournamentId, input.tournamentId),
					with: {
						achievement: true,
						user: {
							columns: {
								id: true,
								displayName: true,
								imageUrl: true,
							},
						},
					},
					orderBy: [desc(userAchievements.unlockedAt)],
				});

			return {
				tournament: {
					id: tournament.id,
					name: tournament.name,
					year: tournament.year,
					closedAt: tournament.closedAt,
				},
				podium,
				topPerformers: {
					mostExactScores: mostExactScores
						? {
								userId: mostExactScores.userId,
								displayName: mostExactScores.displayName,
								imageUrl: mostExactScores.imageUrl,
								exactScores: mostExactScores.exactScores,
								totalPredictions: allMatchPicks.filter(
									(p) => p.userId === mostExactScores.userId,
								).length,
							}
						: null,
					bestRoundAccuracy,
					mostConsistent,
					longestStreak: longestStreak
						? {
								userId: longestStreak.userId,
								displayName: longestStreak.displayName,
								imageUrl: longestStreak.imageUrl,
								streak: longestStreak.longestStreak,
							}
						: null,
				},
				creativeStats: {
					upsetCallers: topUpsetCallers,
					consensusFavorites,
					contrarianWinners: topContrarianWinners,
					closestCompetition,
					totalUpsets: upsetMatches.length,
				},
				roundWinners,
				overview: {
					totalParticipants: leaderboard.length,
					totalPredictions,
					totalMatches,
					finalizedMatches,
					averageAccuracy,
					upsetRate,
				},
				achievements: tournamentAchievements,
			};
		}),
});
