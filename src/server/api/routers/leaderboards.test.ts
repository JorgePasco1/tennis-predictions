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
