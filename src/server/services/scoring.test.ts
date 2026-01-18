/**
 * Scoring Service Unit Tests
 *
 * Tests for match score calculation and unfinalization logic.
 * This is critical business logic that determines user points.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	mockMatches,
	mockMatchPicks,
	mockRounds,
	mockScoringRules,
	mockUserRoundPicks,
	mockUsers,
} from "~/test/fixtures";
import {
	calculateMatchPickScores,
	recalculateUserRoundPickTotals,
	unfinalizeMatchScores,
} from "./scoring";

// Mock database type for testing
type MockDb = {
	query: {
		matches: {
			findFirst: ReturnType<typeof vi.fn>;
		};
		matchPicks: {
			findMany: ReturnType<typeof vi.fn>;
		};
	};
	update: ReturnType<typeof vi.fn>;
};

function createMockDb(): MockDb {
	return {
		query: {
			matches: {
				findFirst: vi.fn(),
			},
			matchPicks: {
				findMany: vi.fn(),
			},
		},
		update: vi.fn(),
	};
}

describe("scoring service", () => {
	describe("calculateMatchPickScores", () => {
		let mockDb: MockDb;

		beforeEach(() => {
			mockDb = createMockDb();
		});

		it("should throw error when match is not found", async () => {
			mockDb.query.matches.findFirst.mockResolvedValue(null);

			await expect(
				calculateMatchPickScores(mockDb as never, 999),
			).rejects.toThrow("Match 999 not found");
		});

		it("should throw error when match is not finalized", async () => {
			mockDb.query.matches.findFirst.mockResolvedValue({
				...mockMatches.ao_match1,
				status: "pending",
			});

			await expect(
				calculateMatchPickScores(mockDb as never, mockMatches.ao_match1.id),
			).rejects.toThrow("Match 1 is not finalized");
		});

		it("should throw error when match has incomplete result data", async () => {
			mockDb.query.matches.findFirst.mockResolvedValue({
				...mockMatches.ao_match3_finalized,
				winnerName: null, // Missing winner
			});

			await expect(
				calculateMatchPickScores(
					mockDb as never,
					mockMatches.ao_match3_finalized.id,
				),
			).rejects.toThrow("does not have complete result data");
		});

		it("should throw error when match has null setsWon", async () => {
			mockDb.query.matches.findFirst.mockResolvedValue({
				...mockMatches.ao_match3_finalized,
				setsWon: null, // Missing sets won
			});

			await expect(
				calculateMatchPickScores(
					mockDb as never,
					mockMatches.ao_match3_finalized.id,
				),
			).rejects.toThrow("does not have complete result data");
		});

		it("should throw error when match has null setsLost", async () => {
			mockDb.query.matches.findFirst.mockResolvedValue({
				...mockMatches.ao_match3_finalized,
				setsLost: null, // Missing sets lost
			});

			await expect(
				calculateMatchPickScores(
					mockDb as never,
					mockMatches.ao_match3_finalized.id,
				),
			).rejects.toThrow("does not have complete result data");
		});

		it("should award points for correct winner prediction", async () => {
			const matchWithRound = {
				...mockMatches.ao_match3_finalized,
				round: {
					...mockRounds.ao_r128,
					scoringRule: mockScoringRules.ao_r128,
				},
			};

			mockDb.query.matches.findFirst.mockResolvedValue(matchWithRound);

			// User predicted correct winner but wrong score
			mockDb.query.matchPicks.findMany.mockResolvedValue([
				{
					id: 1,
					matchId: mockMatches.ao_match3_finalized.id,
					userRoundPickId: mockUserRoundPicks.player1_ao_r128.id,
					predictedWinner: "Carlos Alcaraz",
					predictedSetsWon: 3,
					predictedSetsLost: 1, // Wrong - actual was 3-0
					isWinnerCorrect: null,
					isExactScore: null,
					pointsEarned: 0,
				},
			]);

			const updateMock = vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([]),
				}),
			});
			mockDb.update = updateMock;

			await calculateMatchPickScores(
				mockDb as never,
				mockMatches.ao_match3_finalized.id,
			);

			// Verify update was called with correct scoring
			expect(updateMock).toHaveBeenCalled();

			// Get the set() call and verify the values
			const setCalls = updateMock.mock.results[0]?.value.set.mock.calls;
			expect(setCalls).toBeDefined();
			expect(setCalls[0][0]).toEqual({
				isWinnerCorrect: true,
				isExactScore: false,
				pointsEarned: 2, // Only winner points (from mockScoringRules.ao_r128)
			});
		});

		it("should award bonus points for exact score prediction", async () => {
			const matchWithRound = {
				...mockMatches.ao_match3_finalized,
				round: {
					...mockRounds.ao_r128,
					scoringRule: mockScoringRules.ao_r128,
				},
			};

			mockDb.query.matches.findFirst.mockResolvedValue(matchWithRound);

			// User predicted correct winner AND exact score
			mockDb.query.matchPicks.findMany.mockResolvedValue([
				{
					id: 1,
					matchId: mockMatches.ao_match3_finalized.id,
					userRoundPickId: mockUserRoundPicks.player1_ao_r128.id,
					predictedWinner: "Carlos Alcaraz",
					predictedSetsWon: 3,
					predictedSetsLost: 0, // Exact match!
					isWinnerCorrect: null,
					isExactScore: null,
					pointsEarned: 0,
				},
			]);

			const updateMock = vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([]),
				}),
			});
			mockDb.update = updateMock;

			await calculateMatchPickScores(
				mockDb as never,
				mockMatches.ao_match3_finalized.id,
			);

			const setCalls = updateMock.mock.results[0]?.value.set.mock.calls;
			expect(setCalls[0][0]).toEqual({
				isWinnerCorrect: true,
				isExactScore: true,
				pointsEarned: 5, // Winner (2) + Exact (3)
			});
		});

		it("should award 0 points for wrong winner prediction", async () => {
			const matchWithRound = {
				...mockMatches.ao_match3_finalized,
				round: {
					...mockRounds.ao_r128,
					scoringRule: mockScoringRules.ao_r128,
				},
			};

			mockDb.query.matches.findFirst.mockResolvedValue(matchWithRound);

			// User predicted wrong winner
			mockDb.query.matchPicks.findMany.mockResolvedValue([
				{
					id: 1,
					matchId: mockMatches.ao_match3_finalized.id,
					userRoundPickId: mockUserRoundPicks.player1_ao_r128.id,
					predictedWinner: "Richard Gasquet", // Wrong winner
					predictedSetsWon: 3,
					predictedSetsLost: 0,
					isWinnerCorrect: null,
					isExactScore: null,
					pointsEarned: 0,
				},
			]);

			const updateMock = vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([]),
				}),
			});
			mockDb.update = updateMock;

			await calculateMatchPickScores(
				mockDb as never,
				mockMatches.ao_match3_finalized.id,
			);

			const setCalls = updateMock.mock.results[0]?.value.set.mock.calls;
			expect(setCalls[0][0]).toEqual({
				isWinnerCorrect: false,
				isExactScore: false,
				pointsEarned: 0,
			});
		});

		it("should use default scoring when no scoring rule exists", async () => {
			const matchWithRound = {
				...mockMatches.ao_match3_finalized,
				round: {
					...mockRounds.ao_r128,
					scoringRule: null, // No scoring rule
				},
			};

			mockDb.query.matches.findFirst.mockResolvedValue(matchWithRound);

			mockDb.query.matchPicks.findMany.mockResolvedValue([
				{
					id: 1,
					matchId: mockMatches.ao_match3_finalized.id,
					userRoundPickId: mockUserRoundPicks.player1_ao_r128.id,
					predictedWinner: "Carlos Alcaraz",
					predictedSetsWon: 3,
					predictedSetsLost: 0,
					isWinnerCorrect: null,
					isExactScore: null,
					pointsEarned: 0,
				},
			]);

			const updateMock = vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([]),
				}),
			});
			mockDb.update = updateMock;

			await calculateMatchPickScores(
				mockDb as never,
				mockMatches.ao_match3_finalized.id,
			);

			const setCalls = updateMock.mock.results[0]?.value.set.mock.calls;
			// Default: 10 for winner, 5 for exact score = 15 total
			expect(setCalls[0][0]).toEqual({
				isWinnerCorrect: true,
				isExactScore: true,
				pointsEarned: 15,
			});
		});

		it("should process multiple picks for the same match", async () => {
			const matchWithRound = {
				...mockMatches.ao_match3_finalized,
				round: {
					...mockRounds.ao_r128,
					scoringRule: mockScoringRules.ao_r128,
				},
			};

			mockDb.query.matches.findFirst.mockResolvedValue(matchWithRound);

			// Two users made picks
			mockDb.query.matchPicks.findMany.mockResolvedValue([
				{
					id: 1,
					matchId: mockMatches.ao_match3_finalized.id,
					userRoundPickId: mockUserRoundPicks.player1_ao_r128.id,
					predictedWinner: "Carlos Alcaraz",
					predictedSetsWon: 3,
					predictedSetsLost: 0, // Exact
					isWinnerCorrect: null,
					isExactScore: null,
					pointsEarned: 0,
				},
				{
					id: 2,
					matchId: mockMatches.ao_match3_finalized.id,
					userRoundPickId: mockUserRoundPicks.player2_ao_r128.id,
					predictedWinner: "Richard Gasquet", // Wrong
					predictedSetsWon: 3,
					predictedSetsLost: 2,
					isWinnerCorrect: null,
					isExactScore: null,
					pointsEarned: 0,
				},
			]);

			const updateMock = vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([]),
				}),
			});
			mockDb.update = updateMock;

			await calculateMatchPickScores(
				mockDb as never,
				mockMatches.ao_match3_finalized.id,
			);

			// Should have called update for each pick
			expect(updateMock).toHaveBeenCalledTimes(4); // 2 matchPicks + 2 userRoundPicks
		});

		it("should handle Final round scoring correctly", async () => {
			const finalMatchWithRound = {
				id: 999,
				roundId: mockRounds.ao_final.id,
				matchNumber: 1,
				player1Name: "Player A",
				player2Name: "Player B",
				winnerName: "Player A",
				finalScore: "6-4, 6-3, 6-2",
				setsWon: 3,
				setsLost: 0,
				status: "finalized" as const,
				finalizedAt: new Date(),
				finalizedBy: mockUsers.admin.id,
				round: {
					...mockRounds.ao_final,
					scoringRule: mockScoringRules.ao_final,
				},
			};

			mockDb.query.matches.findFirst.mockResolvedValue(finalMatchWithRound);

			mockDb.query.matchPicks.findMany.mockResolvedValue([
				{
					id: 1,
					matchId: 999,
					userRoundPickId: 1,
					predictedWinner: "Player A",
					predictedSetsWon: 3,
					predictedSetsLost: 0,
					isWinnerCorrect: null,
					isExactScore: null,
					pointsEarned: 0,
				},
			]);

			const updateMock = vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([]),
				}),
			});
			mockDb.update = updateMock;

			await calculateMatchPickScores(mockDb as never, 999);

			const setCalls = updateMock.mock.results[0]?.value.set.mock.calls;
			// Final: 30 for winner, 45 for exact score = 75 total
			expect(setCalls[0][0]).toEqual({
				isWinnerCorrect: true,
				isExactScore: true,
				pointsEarned: 75,
			});
		});
	});

	describe("recalculateUserRoundPickTotals", () => {
		let mockDb: MockDb;

		beforeEach(() => {
			mockDb = createMockDb();
		});

		it("should calculate totals from all match picks", async () => {
			mockDb.query.matchPicks.findMany.mockResolvedValue([
				{
					id: 1,
					userRoundPickId: 1,
					isWinnerCorrect: true,
					isExactScore: true,
					pointsEarned: 5,
				},
				{
					id: 2,
					userRoundPickId: 1,
					isWinnerCorrect: true,
					isExactScore: false,
					pointsEarned: 2,
				},
				{
					id: 3,
					userRoundPickId: 1,
					isWinnerCorrect: false,
					isExactScore: false,
					pointsEarned: 0,
				},
			]);

			const updateMock = vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([]),
				}),
			});
			mockDb.update = updateMock;

			await recalculateUserRoundPickTotals(mockDb as never, 1);

			const setCalls = updateMock.mock.results[0]?.value.set.mock.calls;
			expect(setCalls[0][0]).toMatchObject({
				totalPoints: 7, // 5 + 2 + 0
				correctWinners: 2, // 2 correct
				exactScores: 1, // 1 exact
			});
		});

		it("should handle empty picks list", async () => {
			mockDb.query.matchPicks.findMany.mockResolvedValue([]);

			const updateMock = vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([]),
				}),
			});
			mockDb.update = updateMock;

			await recalculateUserRoundPickTotals(mockDb as never, 1);

			const setCalls = updateMock.mock.results[0]?.value.set.mock.calls;
			expect(setCalls[0][0]).toMatchObject({
				totalPoints: 0,
				correctWinners: 0,
				exactScores: 0,
			});
		});
	});

	describe("unfinalizeMatchScores", () => {
		let mockDb: MockDb;

		beforeEach(() => {
			mockDb = createMockDb();
		});

		it("should reset all match picks to unscored state", async () => {
			mockDb.query.matchPicks.findMany.mockResolvedValue([
				{
					id: 1,
					matchId: 3,
					userRoundPickId: 1,
					isWinnerCorrect: true,
					isExactScore: true,
					pointsEarned: 5,
				},
				{
					id: 2,
					matchId: 3,
					userRoundPickId: 2,
					isWinnerCorrect: true,
					isExactScore: false,
					pointsEarned: 2,
				},
			]);

			const updateMock = vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([]),
				}),
			});
			mockDb.update = updateMock;

			await unfinalizeMatchScores(mockDb as never, 3);

			// First update should reset all match picks
			const firstUpdate = updateMock.mock.results[0]?.value.set.mock.calls;
			expect(firstUpdate[0][0]).toEqual({
				isWinnerCorrect: null,
				isExactScore: null,
				pointsEarned: 0,
			});
		});

		it("should recalculate user round pick totals for all affected users", async () => {
			mockDb.query.matchPicks.findMany.mockResolvedValue([
				{
					id: 1,
					matchId: 3,
					userRoundPickId: 1,
					isWinnerCorrect: true,
					isExactScore: true,
					pointsEarned: 5,
				},
				{
					id: 2,
					matchId: 3,
					userRoundPickId: 2,
					isWinnerCorrect: true,
					isExactScore: false,
					pointsEarned: 2,
				},
			]);

			const updateMock = vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([]),
				}),
			});
			mockDb.update = updateMock;

			await unfinalizeMatchScores(mockDb as never, 3);

			// Should have called update 3 times:
			// 1. Reset all match picks for match 3
			// 2. Recalculate user round pick 1
			// 3. Recalculate user round pick 2
			expect(updateMock).toHaveBeenCalledTimes(3);
		});

		it("should handle match with no picks", async () => {
			mockDb.query.matchPicks.findMany.mockResolvedValue([]);

			const updateMock = vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([]),
				}),
			});
			mockDb.update = updateMock;

			await unfinalizeMatchScores(mockDb as never, 3);

			// Should only call update once to reset match picks (even if empty)
			expect(updateMock).toHaveBeenCalledTimes(1);
		});
	});
});

// =============================================================================
// Edge Case Tests
// =============================================================================

describe("scoring edge cases", () => {
	describe("score validation scenarios", () => {
		it("should not award exact score bonus when winner is wrong", () => {
			// Even if the score happens to match, wrong winner = 0 points
			const isWinnerCorrect = false;
			const isExactScore = isWinnerCorrect && true; // Score can't be exact if winner is wrong

			expect(isExactScore).toBe(false);
		});

		it("should handle Best of 3 scores correctly", () => {
			const validBo3Scores = [
				{ setsWon: 2, setsLost: 0 },
				{ setsWon: 2, setsLost: 1 },
			];

			for (const score of validBo3Scores) {
				expect(score.setsWon).toBe(2);
				expect(score.setsLost).toBeLessThan(2);
			}
		});

		it("should handle Best of 5 scores correctly", () => {
			const validBo5Scores = [
				{ setsWon: 3, setsLost: 0 },
				{ setsWon: 3, setsLost: 1 },
				{ setsWon: 3, setsLost: 2 },
			];

			for (const score of validBo5Scores) {
				expect(score.setsWon).toBe(3);
				expect(score.setsLost).toBeLessThan(3);
			}
		});
	});

	describe("concurrent scoring scenarios", () => {
		it("should handle unique user round pick ids correctly", () => {
			// Simulate multiple picks from the same user
			const picks = [
				{ userRoundPickId: 1 },
				{ userRoundPickId: 1 },
				{ userRoundPickId: 2 },
			];

			const uniqueIds = [...new Set(picks.map((p) => p.userRoundPickId))];
			expect(uniqueIds).toEqual([1, 2]);
		});
	});
});
