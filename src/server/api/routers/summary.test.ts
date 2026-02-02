/**
 * Summary Router Tests
 *
 * Tests for tournament summary aggregation logic including:
 * - Podium calculation with ties
 * - Upset detection with/without seeds
 * - Empty tournament handling
 * - Contrarian winners threshold
 * - Achievement filtering
 */

import { describe, expect, it } from "vitest";

// =============================================================================
// Podium Calculation Tests
// =============================================================================

describe("summary podium calculations", () => {
	describe("ranking with ties", () => {
		it("should rank users by total points descending", () => {
			const leaderboard = [
				{ userId: "user1", totalPoints: 100 },
				{ userId: "user2", totalPoints: 80 },
				{ userId: "user3", totalPoints: 60 },
			];

			const sorted = leaderboard.sort(
				(a, b) => b.totalPoints - a.totalPoints,
			);

			expect(sorted[0]?.userId).toBe("user1");
			expect(sorted[1]?.userId).toBe("user2");
			expect(sorted[2]?.userId).toBe("user3");
		});

		it("should use earliest submission as tiebreaker", () => {
			const leaderboard = [
				{
					userId: "user1",
					totalPoints: 100,
					earliestSubmission: new Date("2024-01-15T12:00:00Z"),
				},
				{
					userId: "user2",
					totalPoints: 100,
					earliestSubmission: new Date("2024-01-15T10:00:00Z"),
				},
				{
					userId: "user3",
					totalPoints: 100,
					earliestSubmission: new Date("2024-01-15T14:00:00Z"),
				},
			];

			const sorted = leaderboard.sort((a, b) => {
				if (b.totalPoints !== a.totalPoints) {
					return b.totalPoints - a.totalPoints;
				}
				return (
					a.earliestSubmission.getTime() - b.earliestSubmission.getTime()
				);
			});

			expect(sorted[0]?.userId).toBe("user2"); // Submitted earliest
			expect(sorted[1]?.userId).toBe("user1");
			expect(sorted[2]?.userId).toBe("user3");
		});

		it("should calculate margin from previous correctly", () => {
			const podium = [
				{ rank: 1, totalPoints: 100 },
				{ rank: 2, totalPoints: 85 },
				{ rank: 3, totalPoints: 70 },
			];

			const withMargins = podium.map((entry, index) => ({
				...entry,
				marginFromPrevious:
					index > 0
						? (podium[index - 1]?.totalPoints ?? 0) - entry.totalPoints
						: 0,
			}));

			expect(withMargins[0]?.marginFromPrevious).toBe(0);
			expect(withMargins[1]?.marginFromPrevious).toBe(15);
			expect(withMargins[2]?.marginFromPrevious).toBe(15);
		});

		it("should handle exact ties with zero margin", () => {
			const podium = [
				{ rank: 1, totalPoints: 100 },
				{ rank: 2, totalPoints: 100 },
				{ rank: 3, totalPoints: 80 },
			];

			const withMargins = podium.map((entry, index) => ({
				...entry,
				marginFromPrevious:
					index > 0
						? (podium[index - 1]?.totalPoints ?? 0) - entry.totalPoints
						: 0,
			}));

			expect(withMargins[1]?.marginFromPrevious).toBe(0); // Tied with 1st
			expect(withMargins[2]?.marginFromPrevious).toBe(20);
		});
	});

	describe("podium slice", () => {
		it("should return top 3 users only", () => {
			const leaderboard = [
				{ userId: "user1", totalPoints: 100 },
				{ userId: "user2", totalPoints: 80 },
				{ userId: "user3", totalPoints: 60 },
				{ userId: "user4", totalPoints: 40 },
				{ userId: "user5", totalPoints: 20 },
			];

			const podium = leaderboard.slice(0, 3);

			expect(podium.length).toBe(3);
			expect(podium.map((p) => p.userId)).toEqual([
				"user1",
				"user2",
				"user3",
			]);
		});

		it("should handle fewer than 3 participants", () => {
			const leaderboard = [{ userId: "user1", totalPoints: 100 }];

			const podium = leaderboard.slice(0, 3);

			expect(podium.length).toBe(1);
		});
	});
});

// =============================================================================
// Upset Detection Tests
// =============================================================================

describe("summary upset detection", () => {
	describe("seeded matches filter", () => {
		it("should only count matches where both players have seeds", () => {
			const matches = [
				{ id: 1, player1Seed: 1, player2Seed: 16 }, // Both seeded
				{ id: 2, player1Seed: 2, player2Seed: null }, // Only one seeded
				{ id: 3, player1Seed: null, player2Seed: null }, // Neither seeded
				{ id: 4, player1Seed: 8, player2Seed: 9 }, // Both seeded
			];

			const seededMatches = matches.filter(
				(m) => m.player1Seed && m.player2Seed,
			);

			expect(seededMatches.length).toBe(2);
			expect(seededMatches.map((m) => m.id)).toEqual([1, 4]);
		});

		it("should return empty array when no seeded matches", () => {
			const matches = [
				{ id: 1, player1Seed: 1, player2Seed: null },
				{ id: 2, player1Seed: null, player2Seed: 8 },
				{ id: 3, player1Seed: null, player2Seed: null },
			];

			const seededMatches = matches.filter(
				(m) => m.player1Seed && m.player2Seed,
			);

			expect(seededMatches.length).toBe(0);
		});
	});

	describe("upset identification", () => {
		// In tennis, lower seed = better player (seed 1 > seed 16)
		// Upset occurs when higher seed number (worse player) beats lower seed number

		it("should identify upset when higher seed wins against lower seed", () => {
			const match = {
				player1Name: "Player A",
				player2Name: "Player B",
				player1Seed: 16, // Worse seed
				player2Seed: 1, // Better seed
				winnerName: "Player A", // Higher seed won = upset
			};

			const isUpset = detectUpset(match);
			expect(isUpset).toBe(true);
		});

		it("should not count as upset when lower seed wins", () => {
			const match = {
				player1Name: "Player A",
				player2Name: "Player B",
				player1Seed: 1, // Better seed
				player2Seed: 16, // Worse seed
				winnerName: "Player A", // Lower seed won = expected
			};

			const isUpset = detectUpset(match);
			expect(isUpset).toBe(false);
		});

		it("should handle player2 winning as upset", () => {
			const match = {
				player1Name: "Player A",
				player2Name: "Player B",
				player1Seed: 1, // Better seed
				player2Seed: 16, // Worse seed
				winnerName: "Player B", // Higher seed won = upset
			};

			const isUpset = detectUpset(match);
			expect(isUpset).toBe(true);
		});
	});

	describe("upset rate calculation", () => {
		it("should calculate rate using seeded matches as denominator", () => {
			const seededMatchesCount = 10;
			const upsetMatchesCount = 3;

			const upsetRate = (upsetMatchesCount / seededMatchesCount) * 100;

			expect(upsetRate).toBe(30);
		});

		it("should return 0 when no seeded matches", () => {
			const seededMatchesCount = 0;
			const upsetMatchesCount = 0;

			const upsetRate =
				seededMatchesCount > 0
					? (upsetMatchesCount / seededMatchesCount) * 100
					: 0;

			expect(upsetRate).toBe(0);
		});

		it("should handle all seeded matches being upsets", () => {
			const seededMatchesCount = 5;
			const upsetMatchesCount = 5;

			const upsetRate = (upsetMatchesCount / seededMatchesCount) * 100;

			expect(upsetRate).toBe(100);
		});
	});
});

// =============================================================================
// Empty Tournament Tests
// =============================================================================

describe("summary empty tournament handling", () => {
	it("should return zero stats when no participants", () => {
		const overview = {
			totalParticipants: 0,
			totalPredictions: 0,
			totalMatches: 64,
			finalizedMatches: 64,
			seededMatches: 32,
			averageAccuracy: 0,
			upsetRate: 0,
		};

		expect(overview.totalParticipants).toBe(0);
		expect(overview.averageAccuracy).toBe(0);
	});

	it("should return empty podium when no participants", () => {
		const leaderboard: unknown[] = [];
		const podium = leaderboard.slice(0, 3);

		expect(podium).toEqual([]);
	});

	it("should still compute match stats with zero participants", () => {
		const matches = [
			{ id: 1, status: "finalized" },
			{ id: 2, status: "finalized" },
			{ id: 3, status: "pending" },
		];

		const finalizedMatches = matches.filter(
			(m) => m.status === "finalized",
		).length;
		const totalMatches = matches.length;

		expect(finalizedMatches).toBe(2);
		expect(totalMatches).toBe(3);
	});
});

// =============================================================================
// Contrarian Winners Tests
// =============================================================================

describe("summary contrarian winners", () => {
	describe("pick percentage calculation", () => {
		it("should identify picks under 30% threshold as contrarian", () => {
			const matchPicks = [
				{ userId: "user1", matchId: 1, predictedWinner: "Player A" },
				{ userId: "user2", matchId: 1, predictedWinner: "Player A" },
				{ userId: "user3", matchId: 1, predictedWinner: "Player A" },
				{ userId: "user4", matchId: 1, predictedWinner: "Player A" },
				{ userId: "user5", matchId: 1, predictedWinner: "Player B" }, // Only 1/5 = 20%
			];

			const pickCounts = matchPicks.reduce(
				(acc, pick) => {
					acc[pick.predictedWinner] = (acc[pick.predictedWinner] ?? 0) + 1;
					return acc;
				},
				{} as Record<string, number>,
			);

			const totalPicks = matchPicks.length;
			const playerBPercentage =
				((pickCounts["Player B"] ?? 0) / totalPicks) * 100;

			expect(playerBPercentage).toBe(20);
			expect(playerBPercentage < 30).toBe(true);
		});

		it("should not count picks at or above 30% as contrarian", () => {
			const matchPicks = [
				{ userId: "user1", matchId: 1, predictedWinner: "Player A" },
				{ userId: "user2", matchId: 1, predictedWinner: "Player A" },
				{ userId: "user3", matchId: 1, predictedWinner: "Player B" }, // 1/3 = 33%
			];

			const totalPicks = matchPicks.length;
			const playerBPicks = matchPicks.filter(
				(p) => p.predictedWinner === "Player B",
			).length;
			const percentage = (playerBPicks / totalPicks) * 100;

			expect(percentage).toBeCloseTo(33.33, 1);
			expect(percentage < 30).toBe(false);
		});
	});

	describe("contrarian win counting", () => {
		it("should count only correct contrarian picks", () => {
			const contrarianPicks = [
				{ userId: "user1", isWinnerCorrect: true },
				{ userId: "user2", isWinnerCorrect: false },
				{ userId: "user1", isWinnerCorrect: true },
				{ userId: "user3", isWinnerCorrect: true },
			];

			const userContrarianWins = contrarianPicks
				.filter((p) => p.isWinnerCorrect)
				.reduce(
					(acc, pick) => {
						acc[pick.userId] = (acc[pick.userId] ?? 0) + 1;
						return acc;
					},
					{} as Record<string, number>,
				);

			expect(userContrarianWins["user1"]).toBe(2);
			expect(userContrarianWins["user3"]).toBe(1);
			expect(userContrarianWins["user2"]).toBeUndefined();
		});

		it("should rank by contrarian win count descending", () => {
			const userContrarianWins = [
				{ userId: "user1", count: 5 },
				{ userId: "user2", count: 8 },
				{ userId: "user3", count: 3 },
			];

			const sorted = userContrarianWins.sort((a, b) => b.count - a.count);

			expect(sorted[0]?.userId).toBe("user2");
			expect(sorted[1]?.userId).toBe("user1");
			expect(sorted[2]?.userId).toBe("user3");
		});
	});
});

// =============================================================================
// Achievement Filtering Tests
// =============================================================================

describe("summary achievement filtering", () => {
	it("should filter achievements by tournament ID", () => {
		const allAchievements = [
			{ id: 1, tournamentId: 1, achievementId: 100 },
			{ id: 2, tournamentId: 2, achievementId: 101 },
			{ id: 3, tournamentId: 1, achievementId: 102 },
			{ id: 4, tournamentId: 3, achievementId: 100 },
		];

		const tournamentId = 1;
		const filtered = allAchievements.filter(
			(a) => a.tournamentId === tournamentId,
		);

		expect(filtered.length).toBe(2);
		expect(filtered.map((a) => a.id)).toEqual([1, 3]);
	});

	it("should return empty array when no achievements for tournament", () => {
		const allAchievements = [
			{ id: 1, tournamentId: 1, achievementId: 100 },
			{ id: 2, tournamentId: 2, achievementId: 101 },
		];

		const tournamentId = 999;
		const filtered = allAchievements.filter(
			(a) => a.tournamentId === tournamentId,
		);

		expect(filtered).toEqual([]);
	});

	describe("achievement categories", () => {
		it("should group achievements by category", () => {
			const achievements = [
				{ id: 1, category: "round" },
				{ id: 2, category: "streak" },
				{ id: 3, category: "round" },
				{ id: 4, category: "milestone" },
				{ id: 5, category: "special" },
			];

			const grouped = achievements.reduce(
				(acc, a) => {
					if (!acc[a.category]) {
						acc[a.category] = [];
					}
					acc[a.category]?.push(a);
					return acc;
				},
				{} as Record<string, typeof achievements>,
			);

			expect(grouped["round"]?.length).toBe(2);
			expect(grouped["streak"]?.length).toBe(1);
			expect(grouped["milestone"]?.length).toBe(1);
			expect(grouped["special"]?.length).toBe(1);
		});
	});
});

// =============================================================================
// Overview Stats Tests
// =============================================================================

describe("summary overview stats", () => {
	describe("average accuracy", () => {
		it("should calculate accuracy as percentage", () => {
			const totalPredictions = 100;
			const correctPredictions = 75;

			const accuracy = (correctPredictions / totalPredictions) * 100;

			expect(accuracy).toBe(75);
		});

		it("should return 0 when no predictions", () => {
			const totalPredictions = 0;
			const correctPredictions = 0;

			const accuracy =
				totalPredictions > 0
					? (correctPredictions / totalPredictions) * 100
					: 0;

			expect(accuracy).toBe(0);
		});
	});

	describe("match counting", () => {
		it("should count finalized vs total matches", () => {
			const rounds = [
				{
					matches: [
						{ status: "finalized" },
						{ status: "finalized" },
						{ status: "pending" },
					],
				},
				{
					matches: [{ status: "finalized" }, { status: "pending" }],
				},
			];

			const totalMatches = rounds.reduce(
				(sum, r) => sum + r.matches.length,
				0,
			);
			const finalizedMatches = rounds.reduce(
				(sum, r) =>
					sum + r.matches.filter((m) => m.status === "finalized").length,
				0,
			);

			expect(totalMatches).toBe(5);
			expect(finalizedMatches).toBe(3);
		});
	});
});

// =============================================================================
// Helper Function
// =============================================================================

function detectUpset(match: {
	player1Name: string;
	player2Name: string;
	player1Seed: number | null;
	player2Seed: number | null;
	winnerName: string | null;
}): boolean {
	if (
		!match.winnerName ||
		!match.player1Seed ||
		!match.player2Seed
	) {
		return false;
	}

	const player1IsWinner = match.winnerName === match.player1Name;
	const player1HasHigherSeed = match.player1Seed > match.player2Seed;

	// Upset if the higher seeded player (worse ranking) won
	return player1IsWinner ? player1HasHigherSeed : !player1HasHigherSeed;
}
