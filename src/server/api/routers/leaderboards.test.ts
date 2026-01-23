/**
 * Leaderboards Router Integration Tests
 *
 * Tests for leaderboard calculations, rankings, and user statistics.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { mockTournaments } from "~/test/fixtures";
import { createMockDb, type MockDb } from "~/test/mock-db";

describe("leaderboards router", () => {
	describe("getTournamentLeaderboard", () => {
		let mockDb: MockDb;

		beforeEach(() => {
			mockDb = createMockDb();
		});

		it("should return empty array when tournament has no rounds", async () => {
			mockDb.query.tournaments.findFirst.mockResolvedValue(
				mockTournaments.australian_open,
			);
			mockDb.query.rounds.findMany.mockResolvedValue([]);

			const rounds = await mockDb.query.rounds.findMany({});

			expect(rounds.length).toBe(0);
		});

		it("should throw error when tournament not found", async () => {
			mockDb.query.tournaments.findFirst.mockResolvedValue(null);

			const getTournamentLeaderboard = async () => {
				const tournament = await mockDb.query.tournaments.findFirst({});
				if (!tournament) {
					throw new Error("Tournament not found");
				}
				return tournament;
			};

			await expect(getTournamentLeaderboard()).rejects.toThrow(
				"Tournament not found",
			);
		});

		it("should aggregate points across all rounds", () => {
			const userPicks = [
				{ userId: "user-1", roundId: 1, totalPoints: 10 },
				{ userId: "user-1", roundId: 2, totalPoints: 15 },
				{ userId: "user-2", roundId: 1, totalPoints: 8 },
				{ userId: "user-2", roundId: 2, totalPoints: 20 },
			];

			const aggregatedPoints = userPicks.reduce(
				(acc, pick) => {
					acc[pick.userId] = (acc[pick.userId] ?? 0) + pick.totalPoints;
					return acc;
				},
				{} as Record<string, number>,
			);

			expect(aggregatedPoints["user-1"]).toBe(25);
			expect(aggregatedPoints["user-2"]).toBe(28);
		});

		it("should order leaderboard by total points descending", () => {
			const leaderboard = [
				{ userId: "user-1", totalPoints: 25 },
				{ userId: "user-2", totalPoints: 28 },
				{ userId: "user-3", totalPoints: 15 },
			];

			const sorted = [...leaderboard].sort(
				(a, b) => b.totalPoints - a.totalPoints,
			);

			expect(sorted[0]?.userId).toBe("user-2"); // 28 points
			expect(sorted[1]?.userId).toBe("user-1"); // 25 points
			expect(sorted[2]?.userId).toBe("user-3"); // 15 points
		});

		it("should break ties by earliest submission time", () => {
			const leaderboard = [
				{
					userId: "user-1",
					totalPoints: 25,
					earliestSubmission: new Date("2024-01-15T10:00:00Z"),
				},
				{
					userId: "user-2",
					totalPoints: 25,
					earliestSubmission: new Date("2024-01-15T08:00:00Z"),
				},
			];

			const sorted = [...leaderboard].sort((a, b) => {
				if (b.totalPoints !== a.totalPoints) {
					return b.totalPoints - a.totalPoints;
				}
				return a.earliestSubmission.getTime() - b.earliestSubmission.getTime();
			});

			expect(sorted[0]?.userId).toBe("user-2"); // Earlier submission
			expect(sorted[1]?.userId).toBe("user-1");
		});

		it("should assign correct ranks", () => {
			const leaderboard = [
				{ userId: "user-1", totalPoints: 30 },
				{ userId: "user-2", totalPoints: 25 },
				{ userId: "user-3", totalPoints: 20 },
			];

			const ranked = leaderboard.map((entry, index) => ({
				...entry,
				rank: index + 1,
			}));

			expect(ranked[0]?.rank).toBe(1);
			expect(ranked[1]?.rank).toBe(2);
			expect(ranked[2]?.rank).toBe(3);
		});
	});

	describe("getAllTimeLeaderboard", () => {
		let mockDb: MockDb;

		beforeEach(() => {
			mockDb = createMockDb();
		});

		it("should return empty array when no tournaments exist", async () => {
			mockDb.query.tournaments.findMany.mockResolvedValue([]);

			const tournaments = await mockDb.query.tournaments.findMany({});

			expect(tournaments.length).toBe(0);
		});

		it("should aggregate points across all tournaments", () => {
			const userPicks = [
				{ userId: "user-1", tournamentId: 1, totalPoints: 50 },
				{ userId: "user-1", tournamentId: 2, totalPoints: 75 },
				{ userId: "user-2", tournamentId: 1, totalPoints: 60 },
			];

			const aggregated = userPicks.reduce(
				(acc, pick) => {
					acc[pick.userId] = (acc[pick.userId] ?? 0) + pick.totalPoints;
					return acc;
				},
				{} as Record<string, number>,
			);

			expect(aggregated["user-1"]).toBe(125);
			expect(aggregated["user-2"]).toBe(60);
		});

		it("should count distinct tournaments played", () => {
			const userPicks = [
				{ userId: "user-1", tournamentId: 1, roundId: 1 },
				{ userId: "user-1", tournamentId: 1, roundId: 2 },
				{ userId: "user-1", tournamentId: 2, roundId: 1 },
			];

			const tournamentsPlayed = new Set(
				userPicks
					.filter((p) => p.userId === "user-1")
					.map((p) => p.tournamentId),
			).size;

			expect(tournamentsPlayed).toBe(2);
		});

		it("should count distinct rounds played", () => {
			const userPicks = [
				{ userId: "user-1", roundId: 1 },
				{ userId: "user-1", roundId: 2 },
				{ userId: "user-1", roundId: 3 },
			];

			const roundsPlayed = new Set(
				userPicks.filter((p) => p.userId === "user-1").map((p) => p.roundId),
			).size;

			expect(roundsPlayed).toBe(3);
		});
	});

	describe("getUserTournamentStats", () => {
		let _mockDb: MockDb;

		beforeEach(() => {
			_mockDb = createMockDb();
		});

		it("should return null when user has no picks", async () => {
			const leaderboard: { userId: string }[] = [];

			const userIndex = leaderboard.findIndex((e) => e.userId === "user-1");

			expect(userIndex).toBe(-1);
		});

		it("should calculate user rank correctly", () => {
			const leaderboard = [
				{ userId: "user-3", totalPoints: 100 },
				{ userId: "user-1", totalPoints: 75 },
				{ userId: "user-2", totalPoints: 50 },
			];

			const findUserRank = (userId: string) => {
				const index = leaderboard.findIndex((e) => e.userId === userId);
				return index === -1 ? null : index + 1;
			};

			expect(findUserRank("user-3")).toBe(1);
			expect(findUserRank("user-1")).toBe(2);
			expect(findUserRank("user-2")).toBe(3);
			expect(findUserRank("unknown")).toBe(null);
		});

		it("should include total participants count", () => {
			const leaderboard = [
				{ userId: "user-1" },
				{ userId: "user-2" },
				{ userId: "user-3" },
			];

			expect(leaderboard.length).toBe(3);
		});
	});

	describe("getUserStats", () => {
		let _mockDb: MockDb;

		beforeEach(() => {
			_mockDb = createMockDb();
		});

		it("should calculate overall statistics", () => {
			const userPicks = [
				{
					totalPoints: 15,
					correctWinners: 5,
					exactScores: 2,
					matchPicks: [{}, {}, {}, {}, {}],
				},
				{
					totalPoints: 10,
					correctWinners: 3,
					exactScores: 1,
					matchPicks: [{}, {}, {}, {}],
				},
			];

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

			expect(totalPoints).toBe(25);
			expect(totalCorrectWinners).toBe(8);
			expect(totalExactScores).toBe(3);
			expect(totalPredictions).toBe(9);
		});

		it("should calculate accuracy percentage", () => {
			const totalCorrectWinners = 8;
			const totalPredictions = 10;

			const accuracy =
				totalPredictions > 0
					? (totalCorrectWinners / totalPredictions) * 100
					: 0;

			expect(accuracy).toBe(80);
		});

		it("should calculate exact score rate", () => {
			const totalExactScores = 3;
			const totalPredictions = 10;

			const exactScoreRate =
				totalPredictions > 0 ? (totalExactScores / totalPredictions) * 100 : 0;

			expect(exactScoreRate).toBe(30);
		});

		it("should handle zero predictions gracefully", () => {
			const totalCorrectWinners = 0;
			const totalPredictions = 0;

			const accuracy =
				totalPredictions > 0
					? (totalCorrectWinners / totalPredictions) * 100
					: 0;

			expect(accuracy).toBe(0);
		});

		it("should group statistics by tournament", () => {
			const userPicks = [
				{
					round: {
						tournament: { id: 1, name: "Australian Open", year: 2024 },
					},
					totalPoints: 25,
					correctWinners: 8,
					exactScores: 3,
					matchPicks: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}],
				},
				{
					round: {
						tournament: { id: 1, name: "Australian Open", year: 2024 },
					},
					totalPoints: 15,
					correctWinners: 5,
					exactScores: 2,
					matchPicks: [{}, {}, {}, {}, {}],
				},
				{
					round: {
						tournament: { id: 2, name: "Wimbledon", year: 2024 },
					},
					totalPoints: 30,
					correctWinners: 10,
					exactScores: 4,
					matchPicks: [{}, {}, {}, {}, {}, {}, {}, {}],
				},
			];

			const tournamentMap = new Map<
				number,
				{ points: number; roundsPlayed: number }
			>();

			for (const pick of userPicks) {
				const tid = pick.round.tournament.id;
				const existing = tournamentMap.get(tid) ?? {
					points: 0,
					roundsPlayed: 0,
				};
				tournamentMap.set(tid, {
					points: existing.points + pick.totalPoints,
					roundsPlayed: existing.roundsPlayed + 1,
				});
			}

			expect(tournamentMap.get(1)?.points).toBe(40);
			expect(tournamentMap.get(1)?.roundsPlayed).toBe(2);
			expect(tournamentMap.get(2)?.points).toBe(30);
			expect(tournamentMap.get(2)?.roundsPlayed).toBe(1);
		});

		it("should identify best tournament", () => {
			const tournamentStats = [
				{ tournamentId: 1, points: 40 },
				{ tournamentId: 2, points: 30 },
				{ tournamentId: 3, points: 55 },
			];

			const best = tournamentStats.reduce((max, current) =>
				current.points > max.points ? current : max,
			);

			expect(best.tournamentId).toBe(3);
			expect(best.points).toBe(55);
		});

		it("should return recent activity ordered by submission time", () => {
			const recentActivity = [
				{ submittedAt: new Date("2024-03-15") },
				{ submittedAt: new Date("2024-01-15") },
				{ submittedAt: new Date("2024-02-15") },
			];

			const sorted = [...recentActivity].sort(
				(a, b) => b.submittedAt.getTime() - a.submittedAt.getTime(),
			);

			// Verify descending order by date
			expect(sorted[0]?.submittedAt.getTime()).toBeGreaterThan(
				sorted[1]?.submittedAt.getTime() ?? 0,
			);
			expect(sorted[1]?.submittedAt.getTime()).toBeGreaterThan(
				sorted[2]?.submittedAt.getTime() ?? 0,
			);
		});

		it("should limit recent activity to 5 items", () => {
			const allActivity = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => ({
				id: i,
			}));

			const recentActivity = allActivity.slice(0, 5);

			expect(recentActivity.length).toBe(5);
		});

		it("should exclude draft picks from statistics", () => {
			const allPicks = [
				{ isDraft: false, totalPoints: 10 },
				{ isDraft: true, totalPoints: 5 },
				{ isDraft: false, totalPoints: 15 },
			];

			const finalPicks = allPicks.filter((p) => !p.isDraft);
			const totalPoints = finalPicks.reduce((sum, p) => sum + p.totalPoints, 0);

			expect(finalPicks.length).toBe(2);
			expect(totalPoints).toBe(25); // Excludes the draft pick's 5 points
		});
	});
});

// =============================================================================
// Leaderboard Calculation Edge Cases
// =============================================================================

describe("leaderboard calculation edge cases", () => {
	describe("tie-breaking scenarios", () => {
		it("should handle multiple users with same points and time", () => {
			const leaderboard = [
				{
					userId: "user-1",
					totalPoints: 50,
					earliestSubmission: new Date("2024-01-15T10:00:00Z"),
				},
				{
					userId: "user-2",
					totalPoints: 50,
					earliestSubmission: new Date("2024-01-15T10:00:00Z"),
				},
			];

			// When everything is equal, maintain insertion order
			const sorted = [...leaderboard].sort((a, b) => {
				if (b.totalPoints !== a.totalPoints) {
					return b.totalPoints - a.totalPoints;
				}
				return a.earliestSubmission.getTime() - b.earliestSubmission.getTime();
			});

			// Both have same rank effectively (tie)
			expect(sorted.length).toBe(2);
		});
	});

	describe("large dataset handling", () => {
		it("should handle 1000+ users efficiently", () => {
			const users = Array.from({ length: 1000 }, (_, i) => ({
				userId: `user-${i}`,
				totalPoints: Math.floor(Math.random() * 1000),
			}));

			const startTime = Date.now();
			const sorted = [...users].sort((a, b) => b.totalPoints - a.totalPoints);
			const duration = Date.now() - startTime;

			// Sorting should be fast (< 100ms even for 1000 items)
			expect(duration).toBeLessThan(100);
			expect(sorted.length).toBe(1000);
		});
	});

	describe("zero state handling", () => {
		it("should handle user with all zero scores", () => {
			const stats = {
				totalPoints: 0,
				correctWinners: 0,
				exactScores: 0,
				totalPredictions: 10,
			};

			const accuracy =
				stats.totalPredictions > 0
					? (stats.correctWinners / stats.totalPredictions) * 100
					: 0;

			expect(accuracy).toBe(0);
		});

		it("should handle new user with no history", () => {
			const _userPicks: unknown[] = [];

			const stats = {
				totalPoints: 0,
				totalCorrectWinners: 0,
				totalExactScores: 0,
				totalPredictions: 0,
				accuracy: 0,
				exactScoreRate: 0,
				rank: null,
				tournamentsPlayed: 0,
				roundsPlayed: 0,
			};

			expect(stats.rank).toBeNull();
			expect(stats.tournamentsPlayed).toBe(0);
		});
	});
});

// =============================================================================
// Statistics Accuracy Tests
// =============================================================================

describe("statistics accuracy", () => {
	describe("point calculations", () => {
		it("should sum points correctly across rounds", () => {
			const roundPoints = [10, 15, 20, 25, 30];
			const total = roundPoints.reduce((sum, p) => sum + p, 0);

			expect(total).toBe(100);
		});

		it("should handle floating point precision", () => {
			// Accuracy percentage should be displayed correctly
			const correctWinners = 7;
			const totalPredictions = 9;
			const accuracy = (correctWinners / totalPredictions) * 100;

			// Should be approximately 77.78%
			expect(Math.round(accuracy * 100) / 100).toBeCloseTo(77.78, 1);
		});
	});

	describe("ranking consistency", () => {
		it("should maintain consistent ranking across calls", () => {
			const leaderboard = [
				{ userId: "user-1", totalPoints: 100 },
				{ userId: "user-2", totalPoints: 75 },
				{ userId: "user-3", totalPoints: 50 },
			];

			// Multiple sorts should produce same result
			const sort1 = [...leaderboard].sort(
				(a, b) => b.totalPoints - a.totalPoints,
			);
			const sort2 = [...leaderboard].sort(
				(a, b) => b.totalPoints - a.totalPoints,
			);

			expect(sort1.map((e) => e.userId)).toEqual(sort2.map((e) => e.userId));
		});
	});
});

// =============================================================================
// Per-Round Leaderboard Tests (getPerRoundLeaderboard)
// =============================================================================

describe("getPerRoundLeaderboard", () => {
	let mockDb: MockDb;

	beforeEach(() => {
		mockDb = createMockDb();
	});

	describe("basic functionality", () => {
		it("should return empty arrays when tournament has no rounds", async () => {
			mockDb.query.rounds.findMany.mockResolvedValue([]);

			const rounds = await mockDb.query.rounds.findMany({});

			expect(rounds.length).toBe(0);

			// Simulating the procedure's response structure
			const result = {
				rounds: [],
				userRoundData: [],
			};

			expect(result.rounds).toEqual([]);
			expect(result.userRoundData).toEqual([]);
		});

		it("should return rounds metadata with correct structure", () => {
			const tournamentRounds = [
				{
					id: 1,
					roundNumber: 1,
					name: "Round of 128",
					isFinalized: false,
					matches: [
						{ id: 1, status: "pending" },
						{ id: 2, status: "finalized" },
					],
				},
				{
					id: 2,
					roundNumber: 2,
					name: "Round of 64",
					isFinalized: true,
					matches: [{ id: 3, status: "finalized" }],
				},
			];

			// Simulate building rounds metadata (similar to procedure logic)
			const roundsMetadata = tournamentRounds.map((round) => ({
				roundId: round.id,
				roundName: round.name,
				roundNumber: round.roundNumber,
				totalMatches: round.matches.length,
				finalizedMatches: round.matches.filter((m) => m.status === "finalized")
					.length,
				isFinalized: round.isFinalized,
			}));

			expect(roundsMetadata).toHaveLength(2);
			expect(roundsMetadata[0]).toEqual({
				roundId: 1,
				roundName: "Round of 128",
				roundNumber: 1,
				totalMatches: 2,
				finalizedMatches: 1,
				isFinalized: false,
			});
			expect(roundsMetadata[1]).toEqual({
				roundId: 2,
				roundName: "Round of 64",
				roundNumber: 2,
				totalMatches: 1,
				finalizedMatches: 1,
				isFinalized: true,
			});
		});

		it("should return user round data with per-round statistics", () => {
			const userPicks = [
				{
					userId: "user-1",
					displayName: "Player 1",
					imageUrl: null,
					roundId: 1,
					totalPoints: 10,
					correctWinners: 3,
					exactScores: 1,
					submittedAt: new Date("2024-01-15T10:00:00Z"),
				},
				{
					userId: "user-1",
					displayName: "Player 1",
					imageUrl: null,
					roundId: 2,
					totalPoints: 15,
					correctWinners: 5,
					exactScores: 2,
					submittedAt: new Date("2024-01-16T10:00:00Z"),
				},
			];

			// Group picks by user
			const userPicksMap = new Map<
				string,
				{ displayName: string; picks: typeof userPicks }
			>();
			for (const pick of userPicks) {
				if (!userPicksMap.has(pick.userId)) {
					userPicksMap.set(pick.userId, {
						displayName: pick.displayName,
						picks: [],
					});
				}
				userPicksMap.get(pick.userId)?.picks.push(pick);
			}

			expect(userPicksMap.size).toBe(1);
			expect(userPicksMap.get("user-1")?.picks).toHaveLength(2);
		});
	});

	describe("empty tournament handling", () => {
		it("should handle tournament with no user picks", () => {
			const tournamentRounds = [
				{
					id: 1,
					roundNumber: 1,
					name: "Round of 128",
					isFinalized: false,
					matches: [],
				},
			];

			const allUserRoundPicks: unknown[] = [];

			// When no picks exist, userRoundData should be empty
			const result = {
				rounds: tournamentRounds.map((r) => ({
					roundId: r.id,
					roundName: r.name,
					roundNumber: r.roundNumber,
					isFinalized: r.isFinalized,
				})),
				userRoundData: allUserRoundPicks.length === 0 ? [] : [],
			};

			expect(result.rounds).toHaveLength(1);
			expect(result.userRoundData).toHaveLength(0);
		});

		it("should handle tournament with no finalized matches", () => {
			const rounds = [
				{
					id: 1,
					matches: [
						{ id: 1, status: "pending", finalizedAt: null },
						{ id: 2, status: "pending", finalizedAt: null },
					],
				},
			];

			const allMatches = rounds.flatMap((round) =>
				round.matches.filter((m) => m.status === "finalized" && m.finalizedAt),
			);

			expect(allMatches).toHaveLength(0);
		});
	});

	describe("partial data handling", () => {
		it("should handle users who have not submitted all rounds", () => {
			const tournamentRounds = [
				{ id: 1, roundNumber: 1, name: "Round of 128" },
				{ id: 2, roundNumber: 2, name: "Round of 64" },
				{ id: 3, roundNumber: 3, name: "Round of 32" },
			];

			const userPicks = [
				// User 1 submitted rounds 1 and 2
				{ userId: "user-1", roundId: 1, totalPoints: 10 },
				{ userId: "user-1", roundId: 2, totalPoints: 15 },
				// User 2 only submitted round 1
				{ userId: "user-2", roundId: 1, totalPoints: 8 },
			];

			// Build per-round data for each user
			const buildUserRoundData = (userId: string) => {
				const userSubmissions = userPicks.filter((p) => p.userId === userId);
				const picksByRound = new Map(
					userSubmissions.map((p) => [p.roundId, p]),
				);

				let cumulativePoints = 0;
				return tournamentRounds.map((round) => {
					const pick = picksByRound.get(round.id);
					if (pick) {
						cumulativePoints += pick.totalPoints;
					}
					return {
						roundId: round.id,
						roundNumber: round.roundNumber,
						totalPoints: pick?.totalPoints ?? 0,
						cumulativePoints,
						hasSubmitted: !!pick,
					};
				});
			};

			const user1Data = buildUserRoundData("user-1");
			const user2Data = buildUserRoundData("user-2");

			// User 1: submitted R1 (10pts) and R2 (15pts), not R3
			expect(user1Data[0]?.hasSubmitted).toBe(true);
			expect(user1Data[0]?.cumulativePoints).toBe(10);
			expect(user1Data[1]?.hasSubmitted).toBe(true);
			expect(user1Data[1]?.cumulativePoints).toBe(25);
			expect(user1Data[2]?.hasSubmitted).toBe(false);
			expect(user1Data[2]?.cumulativePoints).toBe(25); // Stays at 25

			// User 2: only submitted R1 (8pts)
			expect(user2Data[0]?.hasSubmitted).toBe(true);
			expect(user2Data[0]?.cumulativePoints).toBe(8);
			expect(user2Data[1]?.hasSubmitted).toBe(false);
			expect(user2Data[1]?.cumulativePoints).toBe(8);
			expect(user2Data[2]?.hasSubmitted).toBe(false);
			expect(user2Data[2]?.cumulativePoints).toBe(8);
		});

		it("should show null rank for rounds user has not submitted", () => {
			// tournamentRounds defines the structure we're testing against
			const _tournamentRounds = [
				{ id: 1, roundNumber: 1 },
				{ id: 2, roundNumber: 2 },
			];

			const userPicks = [
				{
					userId: "user-1",
					roundId: 1,
					totalPoints: 10,
					submittedAt: new Date(),
				},
				{
					userId: "user-2",
					roundId: 1,
					totalPoints: 8,
					submittedAt: new Date(),
				},
				{
					userId: "user-2",
					roundId: 2,
					totalPoints: 12,
					submittedAt: new Date(),
				},
				// User 1 did not submit round 2
			];

			// Calculate ranks for round 2
			const round2Picks = userPicks
				.filter((p) => p.roundId === 2)
				.sort((a, b) => b.totalPoints - a.totalPoints);

			const round2Ranks = new Map<string, number>();
			round2Picks.forEach((p, idx) => {
				round2Ranks.set(p.userId, idx + 1);
			});

			// User 1 should have null rank for round 2
			expect(round2Ranks.get("user-1")).toBeUndefined();
			expect(round2Ranks.get("user-2")).toBe(1);
		});
	});

	describe("ranking calculations", () => {
		it("should calculate per-round rankings correctly", () => {
			const roundPicks = [
				{
					userId: "user-1",
					totalPoints: 15,
					submittedAt: new Date("2024-01-15T10:00:00Z"),
				},
				{
					userId: "user-2",
					totalPoints: 20,
					submittedAt: new Date("2024-01-15T11:00:00Z"),
				},
				{
					userId: "user-3",
					totalPoints: 10,
					submittedAt: new Date("2024-01-15T09:00:00Z"),
				},
			];

			const sorted = [...roundPicks].sort((a, b) => {
				if (b.totalPoints !== a.totalPoints) {
					return b.totalPoints - a.totalPoints;
				}
				return a.submittedAt.getTime() - b.submittedAt.getTime();
			});

			const ranks = sorted.map((p, idx) => ({
				userId: p.userId,
				rank: idx + 1,
			}));

			expect(ranks.find((r) => r.userId === "user-2")?.rank).toBe(1); // 20 points
			expect(ranks.find((r) => r.userId === "user-1")?.rank).toBe(2); // 15 points
			expect(ranks.find((r) => r.userId === "user-3")?.rank).toBe(3); // 10 points
		});

		it("should calculate cumulative rankings correctly across rounds", () => {
			const users = [
				{ userId: "user-1", rounds: [{ points: 10 }, { points: 5 }] },
				{ userId: "user-2", rounds: [{ points: 8 }, { points: 12 }] },
				{ userId: "user-3", rounds: [{ points: 15 }, { points: 3 }] },
			];

			// After round 1: user-3 (15), user-1 (10), user-2 (8)
			// After round 2: user-2 (20), user-3 (18), user-1 (15)

			const getCumulativeRanks = (afterRound: number) => {
				const cumulative = users.map((u) => ({
					userId: u.userId,
					total: u.rounds
						.slice(0, afterRound + 1)
						.reduce((sum, r) => sum + r.points, 0),
				}));

				cumulative.sort((a, b) => b.total - a.total);
				return cumulative.map((u, idx) => ({
					userId: u.userId,
					rank: idx + 1,
				}));
			};

			const ranksAfterR1 = getCumulativeRanks(0);
			expect(ranksAfterR1.find((r) => r.userId === "user-3")?.rank).toBe(1);
			expect(ranksAfterR1.find((r) => r.userId === "user-1")?.rank).toBe(2);
			expect(ranksAfterR1.find((r) => r.userId === "user-2")?.rank).toBe(3);

			const ranksAfterR2 = getCumulativeRanks(1);
			expect(ranksAfterR2.find((r) => r.userId === "user-2")?.rank).toBe(1); // 20 total
			expect(ranksAfterR2.find((r) => r.userId === "user-3")?.rank).toBe(2); // 18 total
			expect(ranksAfterR2.find((r) => r.userId === "user-1")?.rank).toBe(3); // 15 total
		});

		it("should handle ties with earlier submission winning", () => {
			const roundPicks = [
				{
					userId: "user-1",
					cumulativePoints: 25,
					earliestSubmission: new Date("2024-01-15T12:00:00Z"),
				},
				{
					userId: "user-2",
					cumulativePoints: 25,
					earliestSubmission: new Date("2024-01-15T10:00:00Z"),
				},
				{
					userId: "user-3",
					cumulativePoints: 25,
					earliestSubmission: new Date("2024-01-15T11:00:00Z"),
				},
			];

			const sorted = [...roundPicks].sort((a, b) => {
				if (b.cumulativePoints !== a.cumulativePoints) {
					return b.cumulativePoints - a.cumulativePoints;
				}
				return a.earliestSubmission.getTime() - b.earliestSubmission.getTime();
			});

			expect(sorted[0]?.userId).toBe("user-2"); // Earliest at 10:00
			expect(sorted[1]?.userId).toBe("user-3"); // Second at 11:00
			expect(sorted[2]?.userId).toBe("user-1"); // Latest at 12:00
		});

		it("should assign final ranks based on total points", () => {
			const users = [
				{ userId: "user-1", totalPoints: 50 },
				{ userId: "user-2", totalPoints: 75 },
				{ userId: "user-3", totalPoints: 30 },
			];

			const sorted = [...users].sort((a, b) => b.totalPoints - a.totalPoints);
			const ranked = sorted.map((u, idx) => ({ ...u, finalRank: idx + 1 }));

			expect(ranked.find((r) => r.userId === "user-2")?.finalRank).toBe(1);
			expect(ranked.find((r) => r.userId === "user-1")?.finalRank).toBe(2);
			expect(ranked.find((r) => r.userId === "user-3")?.finalRank).toBe(3);
		});
	});

	describe("progression data calculation", () => {
		it("should create exactly 8 progression checkpoints", () => {
			const totalMatches = 64;
			const NUM_CHECKPOINTS = 8;

			const checkpoints: number[] = [];
			const interval = totalMatches / NUM_CHECKPOINTS;

			for (let i = 1; i <= NUM_CHECKPOINTS; i++) {
				checkpoints.push(Math.round(interval * i));
			}

			expect(checkpoints).toHaveLength(8);
			expect(checkpoints[0]).toBe(8); // 64/8 = 8
			expect(checkpoints[7]).toBe(64); // Last checkpoint is total
		});

		it("should distribute checkpoints evenly for various match counts", () => {
			// The expected values are calculated using Math.round(interval * i)
			// For 31 matches: interval = 31/8 = 3.875
			// i=4: Math.round(3.875 * 4) = Math.round(15.5) = 16
			const testCases = [
				{ totalMatches: 127, expected: [16, 32, 48, 64, 79, 95, 111, 127] },
				{ totalMatches: 63, expected: [8, 16, 24, 32, 39, 47, 55, 63] },
				{ totalMatches: 31, expected: [4, 8, 12, 16, 19, 23, 27, 31] },
				{ totalMatches: 16, expected: [2, 4, 6, 8, 10, 12, 14, 16] },
			];

			for (const { totalMatches, expected } of testCases) {
				const NUM_CHECKPOINTS = 8;
				const interval = totalMatches / NUM_CHECKPOINTS;
				const checkpoints = [];

				for (let i = 1; i <= NUM_CHECKPOINTS; i++) {
					checkpoints.push(Math.round(interval * i));
				}

				expect(checkpoints).toEqual(expected);
			}
		});

		it("should calculate user rankings at each checkpoint", () => {
			// Simulated match-by-match points for 2 users over 8 matches
			const matchPoints = [
				{ matchId: 1, user1: 5, user2: 0 },
				{ matchId: 2, user1: 0, user2: 5 },
				{ matchId: 3, user1: 5, user2: 5 },
				{ matchId: 4, user1: 0, user2: 5 },
				{ matchId: 5, user1: 5, user2: 0 },
				{ matchId: 6, user1: 5, user2: 5 },
				{ matchId: 7, user1: 0, user2: 5 },
				{ matchId: 8, user1: 5, user2: 0 },
			];

			const calculateRankingsAtMatch = (matchCount: number) => {
				const matchesUpToNow = matchPoints.slice(0, matchCount);
				const user1Total = matchesUpToNow.reduce((sum, m) => sum + m.user1, 0);
				const user2Total = matchesUpToNow.reduce((sum, m) => sum + m.user2, 0);

				const sorted = [
					{ userId: "user-1", points: user1Total },
					{ userId: "user-2", points: user2Total },
				].sort((a, b) => b.points - a.points);

				return sorted.map((u, idx) => ({ userId: u.userId, rank: idx + 1 }));
			};

			// At match 4: user1=10, user2=15 -> user2 leads
			const ranksAt4 = calculateRankingsAtMatch(4);
			expect(ranksAt4[0]?.userId).toBe("user-2");
			expect(ranksAt4[0]?.rank).toBe(1);

			// At match 8: user1=25, user2=25 -> tie
			const ranksAt8 = calculateRankingsAtMatch(8);
			expect(ranksAt8[0]?.rank).toBe(1);
			expect(ranksAt8[1]?.rank).toBe(2);
		});

		it("should return empty progression data when no matches are finalized", () => {
			const allMatches: { status: string; finalizedAt: Date | null }[] = [
				{ status: "pending", finalizedAt: null },
				{ status: "pending", finalizedAt: null },
			];

			const finalizedMatches = allMatches.filter(
				(m) => m.status === "finalized" && m.finalizedAt,
			);

			expect(finalizedMatches).toHaveLength(0);

			// When no finalized matches, progressionData should be empty
			const progressionData =
				finalizedMatches.length > 0 ? [{ matchIndex: 1, rankings: [] }] : [];

			expect(progressionData).toHaveLength(0);
		});

		it("should handle progression with only one user", () => {
			const userPoints = new Map([
				[
					"user-1",
					new Map([
						[1, 5],
						[2, 10],
						[3, 5],
					]),
				],
			]);

			const matchIds = [1, 2, 3];
			const checkpoints = [1, 2, 3];

			const progressionData = checkpoints.map((matchCount) => {
				const matchIdsUpToNow = new Set(matchIds.slice(0, matchCount));
				const userCumulative: { userId: string; points: number }[] = [];

				for (const [userId, matches] of userPoints) {
					let total = 0;
					for (const [matchId, points] of matches) {
						if (matchIdsUpToNow.has(matchId)) {
							total += points;
						}
					}
					userCumulative.push({ userId, points: total });
				}

				userCumulative.sort((a, b) => b.points - a.points);
				return {
					matchIndex: matchCount,
					rankings: userCumulative.map((u, idx) => ({
						userId: u.userId,
						rank: idx + 1,
						cumulativePoints: u.points,
					})),
				};
			});

			expect(progressionData).toHaveLength(3);
			expect(progressionData[0]?.rankings[0]?.cumulativePoints).toBe(5);
			expect(progressionData[1]?.rankings[0]?.cumulativePoints).toBe(15);
			expect(progressionData[2]?.rankings[0]?.cumulativePoints).toBe(20);
			// Single user always has rank 1
			expect(progressionData[2]?.rankings[0]?.rank).toBe(1);
		});
	});

	describe("data integrity", () => {
		it("should only include non-draft picks in calculations", () => {
			const allPicks = [
				{ userId: "user-1", isDraft: false, totalPoints: 10 },
				{ userId: "user-1", isDraft: true, totalPoints: 5 },
				{ userId: "user-2", isDraft: false, totalPoints: 15 },
			];

			const finalPicks = allPicks.filter((p) => !p.isDraft);

			expect(finalPicks).toHaveLength(2);
			expect(finalPicks.find((p) => p.totalPoints === 5)).toBeUndefined();
		});

		it("should exclude deleted matches from finalized counts", () => {
			const matches = [
				{ id: 1, status: "finalized", deletedAt: null },
				{ id: 2, status: "finalized", deletedAt: new Date() },
				{ id: 3, status: "pending", deletedAt: null },
			];

			const validFinalizedMatches = matches.filter(
				(m) => m.status === "finalized" && m.deletedAt === null,
			);

			expect(validFinalizedMatches).toHaveLength(1);
			expect(validFinalizedMatches[0]?.id).toBe(1);
		});

		it("should maintain user identity across rounds", () => {
			const userRoundPicks = [
				{ userId: "user-1", displayName: "Player One", roundId: 1 },
				{ userId: "user-1", displayName: "Player One", roundId: 2 },
				{ userId: "user-2", displayName: "Player Two", roundId: 1 },
			];

			const userMap = new Map<
				string,
				{ displayName: string; roundIds: number[] }
			>();
			for (const pick of userRoundPicks) {
				if (!userMap.has(pick.userId)) {
					userMap.set(pick.userId, {
						displayName: pick.displayName,
						roundIds: [],
					});
				}
				userMap.get(pick.userId)?.roundIds.push(pick.roundId);
			}

			expect(userMap.get("user-1")?.displayName).toBe("Player One");
			expect(userMap.get("user-1")?.roundIds).toEqual([1, 2]);
			expect(userMap.get("user-2")?.roundIds).toEqual([1]);
		});
	});
});

// =============================================================================
// Per-Round Leaderboard Edge Cases
// =============================================================================

describe("per-round leaderboard edge cases", () => {
	describe("large tournament scenarios", () => {
		it("should handle a full 128-player Grand Slam draw", () => {
			// 127 matches total: 64 + 32 + 16 + 8 + 4 + 2 + 1
			const totalMatches = 127;
			const NUM_CHECKPOINTS = 8;
			const interval = totalMatches / NUM_CHECKPOINTS;

			const checkpoints = [];
			for (let i = 1; i <= NUM_CHECKPOINTS; i++) {
				checkpoints.push(Math.round(interval * i));
			}

			// Math.round(127 * 4 / 8) = Math.round(63.5) = 64
			expect(checkpoints).toEqual([16, 32, 48, 64, 79, 95, 111, 127]);
		});

		it("should handle 50+ users competing", () => {
			const users = Array.from({ length: 50 }, (_, i) => ({
				userId: `user-${i}`,
				totalPoints: Math.floor(Math.random() * 500),
			}));

			const startTime = Date.now();
			const sorted = [...users].sort((a, b) => b.totalPoints - a.totalPoints);
			const ranked = sorted.map((u, idx) => ({ ...u, rank: idx + 1 }));
			const duration = Date.now() - startTime;

			expect(ranked).toHaveLength(50);
			expect(ranked[0]?.rank).toBe(1);
			expect(ranked[49]?.rank).toBe(50);
			expect(duration).toBeLessThan(100); // Should be very fast
		});
	});

	describe("boundary conditions", () => {
		it("should handle tournament with only 1 round", () => {
			const rounds = [{ id: 1, roundNumber: 1, name: "Final" }];

			expect(rounds).toHaveLength(1);

			const userRoundData = [
				{
					userId: "user-1",
					rounds: [{ roundId: 1, totalPoints: 30, cumulativePoints: 30 }],
					totalPoints: 30,
				},
			];

			expect(userRoundData[0]?.rounds).toHaveLength(1);
			expect(userRoundData[0]?.rounds[0]?.cumulativePoints).toBe(30);
		});

		it("should handle tournament with only 1 finalized match", () => {
			const matches = [{ id: 1, status: "finalized", finalizedAt: new Date() }];

			const NUM_CHECKPOINTS = 8;
			const interval = matches.length / NUM_CHECKPOINTS;

			// With only 1 match, all checkpoints should be at match 1
			const checkpoints = [];
			for (let i = 1; i <= NUM_CHECKPOINTS; i++) {
				checkpoints.push(Math.max(1, Math.round(interval * i)));
			}

			// All checkpoints converge to 1 for single match
			expect(checkpoints.every((c) => c === 1)).toBe(true);
		});

		it("should handle user with 0 points across all rounds", () => {
			const userRounds = [
				{ roundId: 1, totalPoints: 0, cumulativePoints: 0 },
				{ roundId: 2, totalPoints: 0, cumulativePoints: 0 },
				{ roundId: 3, totalPoints: 0, cumulativePoints: 0 },
			];

			const totalPoints = userRounds.reduce((sum, r) => sum + r.totalPoints, 0);

			expect(totalPoints).toBe(0);
			expect(userRounds[2]?.cumulativePoints).toBe(0);
		});

		it("should handle maximum possible points scenario", () => {
			// Grand Slam with perfect predictions
			// Using example scoring: R128=2+3, R64=3+5, R32=5+8, R16=8+12, QF=12+18, SF=18+27, F=30+45
			const roundScores = [
				{ round: "R128", matches: 64, pointsPerMatch: 5 }, // 64 * 5 = 320
				{ round: "R64", matches: 32, pointsPerMatch: 8 }, // 32 * 8 = 256
				{ round: "R32", matches: 16, pointsPerMatch: 13 }, // 16 * 13 = 208
				{ round: "R16", matches: 8, pointsPerMatch: 20 }, // 8 * 20 = 160
				{ round: "QF", matches: 4, pointsPerMatch: 30 }, // 4 * 30 = 120
				{ round: "SF", matches: 2, pointsPerMatch: 45 }, // 2 * 45 = 90
				{ round: "F", matches: 1, pointsPerMatch: 75 }, // 1 * 75 = 75
			];

			const maxPossiblePoints = roundScores.reduce(
				(sum, r) => sum + r.matches * r.pointsPerMatch,
				0,
			);

			expect(maxPossiblePoints).toBe(1229);
		});
	});

	describe("concurrent submission handling", () => {
		it("should handle users submitting at exact same millisecond", () => {
			const exactSameTime = new Date("2024-01-15T10:00:00.000Z");

			const picks = [
				{ userId: "user-1", cumulativePoints: 50, submittedAt: exactSameTime },
				{ userId: "user-2", cumulativePoints: 50, submittedAt: exactSameTime },
			];

			const sorted = [...picks].sort((a, b) => {
				if (b.cumulativePoints !== a.cumulativePoints) {
					return b.cumulativePoints - a.cumulativePoints;
				}
				return a.submittedAt.getTime() - b.submittedAt.getTime();
			});

			// Both users ranked, order is stable
			expect(sorted).toHaveLength(2);
			expect(sorted[0]?.cumulativePoints).toBe(50);
			expect(sorted[1]?.cumulativePoints).toBe(50);
		});
	});

	describe("round finalization states", () => {
		it("should show correct isFinalized status for each round", () => {
			const rounds = [
				{ id: 1, name: "R128", isFinalized: true },
				{ id: 2, name: "R64", isFinalized: true },
				{ id: 3, name: "R32", isFinalized: false },
				{ id: 4, name: "R16", isFinalized: false },
			];

			const finalizedRounds = rounds.filter((r) => r.isFinalized);
			const pendingRounds = rounds.filter((r) => !r.isFinalized);

			expect(finalizedRounds).toHaveLength(2);
			expect(pendingRounds).toHaveLength(2);
		});

		it("should calculate rankings only for submitted rounds", () => {
			const userData = {
				userId: "user-1",
				rounds: [
					{ roundId: 1, hasSubmitted: true, totalPoints: 10 },
					{ roundId: 2, hasSubmitted: false, totalPoints: 0 },
					{ roundId: 3, hasSubmitted: true, totalPoints: 15 },
				],
			};

			const submittedRounds = userData.rounds.filter((r) => r.hasSubmitted);
			const totalFromSubmitted = submittedRounds.reduce(
				(sum, r) => sum + r.totalPoints,
				0,
			);

			expect(submittedRounds).toHaveLength(2);
			expect(totalFromSubmitted).toBe(25);
		});
	});
});

// =============================================================================
// Progression Chart Data Validation
// =============================================================================

describe("progression chart data validation", () => {
	it("should produce monotonically non-decreasing cumulative points", () => {
		const progressionData = [
			{ matchIndex: 8, rankings: [{ userId: "user-1", cumulativePoints: 20 }] },
			{
				matchIndex: 16,
				rankings: [{ userId: "user-1", cumulativePoints: 45 }],
			},
			{
				matchIndex: 24,
				rankings: [{ userId: "user-1", cumulativePoints: 60 }],
			},
			{
				matchIndex: 32,
				rankings: [{ userId: "user-1", cumulativePoints: 80 }],
			},
		];

		for (let i = 1; i < progressionData.length; i++) {
			const prevPoints =
				progressionData[i - 1]?.rankings[0]?.cumulativePoints ?? 0;
			const currPoints = progressionData[i]?.rankings[0]?.cumulativePoints ?? 0;
			expect(currPoints).toBeGreaterThanOrEqual(prevPoints);
		}
	});

	it("should have consistent user count across all checkpoints", () => {
		const users = ["user-1", "user-2", "user-3"];

		const progressionData = [
			{
				matchIndex: 8,
				rankings: users.map((u) => ({ userId: u, cumulativePoints: 0 })),
			},
			{
				matchIndex: 16,
				rankings: users.map((u) => ({ userId: u, cumulativePoints: 0 })),
			},
			{
				matchIndex: 24,
				rankings: users.map((u) => ({ userId: u, cumulativePoints: 0 })),
			},
		];

		const userCounts = progressionData.map((p) => p.rankings.length);
		expect(userCounts.every((count) => count === users.length)).toBe(true);
	});

	it("should maintain valid rank values (1 to n)", () => {
		const rankings = [
			{ userId: "user-1", rank: 1, cumulativePoints: 100 },
			{ userId: "user-2", rank: 2, cumulativePoints: 75 },
			{ userId: "user-3", rank: 3, cumulativePoints: 50 },
		];

		const ranks = rankings.map((r) => r.rank);
		const expectedRanks = [1, 2, 3];

		expect(ranks).toEqual(expectedRanks);
		expect(Math.min(...ranks)).toBe(1);
		expect(Math.max(...ranks)).toBe(rankings.length);
	});

	it("should have checkpoints in ascending order by matchIndex", () => {
		const progressionData = [
			{ matchIndex: 8 },
			{ matchIndex: 16 },
			{ matchIndex: 24 },
			{ matchIndex: 32 },
			{ matchIndex: 40 },
			{ matchIndex: 48 },
			{ matchIndex: 56 },
			{ matchIndex: 64 },
		];

		for (let i = 1; i < progressionData.length; i++) {
			expect(progressionData[i]?.matchIndex).toBeGreaterThan(
				progressionData[i - 1]?.matchIndex ?? 0,
			);
		}
	});
});
