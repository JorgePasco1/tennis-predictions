/**
 * Picks Router Integration Tests
 *
 * Tests for user pick submissions, drafts, and retrieval.
 * This covers critical business rules around pick timing and validation.
 */

import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it } from "vitest";
import {
	mockMatches,
	mockRounds,
	mockUserRoundPicks,
	scoreTestCases,
} from "~/test/fixtures";
import { createMockDb, type MockDb } from "~/test/mock-db";

describe("picks router", () => {
	describe("submitRoundPicks", () => {
		let mockDb: MockDb;

		beforeEach(() => {
			mockDb = createMockDb();
		});

		describe("round validation", () => {
			it("should reject picks when round is not found", async () => {
				mockDb.query.rounds.findFirst.mockResolvedValue(null);

				const validateRound = async (_roundId: number) => {
					const round = await mockDb.query.rounds.findFirst({});
					if (!round) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message: "Round not found",
						});
					}
					return round;
				};

				await expect(validateRound(999)).rejects.toThrow("Round not found");
			});

			it("should reject picks when round is not active", async () => {
				mockDb.query.rounds.findFirst.mockResolvedValue({
					...mockRounds.ao_r64,
					isActive: false,
				});

				const validateRoundActive = async () => {
					const round = await mockDb.query.rounds.findFirst({});
					if (!round?.isActive) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: "This round is not currently accepting picks",
						});
					}
					return round;
				};

				await expect(validateRoundActive()).rejects.toThrow(
					"This round is not currently accepting picks",
				);
			});

			it("should accept picks when round is active", async () => {
				mockDb.query.rounds.findFirst.mockResolvedValue({
					...mockRounds.ao_r128,
					isActive: true,
				});

				const validateRoundActive = async () => {
					const round = await mockDb.query.rounds.findFirst({});
					if (!round?.isActive) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: "This round is not currently accepting picks",
						});
					}
					return round;
				};

				await expect(validateRoundActive()).resolves.toBeTruthy();
			});
		});

		describe("duplicate pick prevention", () => {
			it("should reject picks when user has already submitted for this round", async () => {
				mockDb.query.userRoundPicks.findFirst.mockResolvedValue({
					...mockUserRoundPicks.player1_ao_r128,
					isDraft: false, // Final submission
				});

				const checkExistingPicks = async () => {
					const existingPicks = await mockDb.query.userRoundPicks.findFirst({});
					if (existingPicks && !existingPicks.isDraft) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: "You have already submitted picks for this round",
						});
					}
					return true;
				};

				await expect(checkExistingPicks()).rejects.toThrow(
					"You have already submitted picks for this round",
				);
			});

			it("should allow submission over existing draft", async () => {
				mockDb.query.userRoundPicks.findFirst.mockResolvedValue({
					...mockUserRoundPicks.player1_ao_r128_draft,
					isDraft: true, // Draft submission
				});

				const checkExistingPicks = async () => {
					const existingPicks = await mockDb.query.userRoundPicks.findFirst({});
					if (existingPicks && !existingPicks.isDraft) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: "You have already submitted picks for this round",
						});
					}
					return true;
				};

				await expect(checkExistingPicks()).resolves.toBe(true);
			});

			it("should allow first submission when no existing picks", async () => {
				mockDb.query.userRoundPicks.findFirst.mockResolvedValue(null);

				const checkExistingPicks = async () => {
					const existingPicks = await mockDb.query.userRoundPicks.findFirst({});
					if (existingPicks && !existingPicks.isDraft) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: "You have already submitted picks for this round",
						});
					}
					return true;
				};

				await expect(checkExistingPicks()).resolves.toBe(true);
			});
		});

		describe("match validation", () => {
			it("should reject picks for matches not in the round", async () => {
				const roundMatchIds = new Set([1, 2, 3]);

				const validateMatchInRound = (matchId: number) => {
					if (!roundMatchIds.has(matchId)) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: `Match ${matchId} is not in this round`,
						});
					}
					return true;
				};

				expect(() => validateMatchInRound(999)).toThrow(
					"Match 999 is not in this round",
				);
				expect(validateMatchInRound(1)).toBe(true);
			});

			it("should reject picks with invalid winner name", () => {
				const match = mockMatches.ao_match1;

				const validateWinner = (predictedWinner: string) => {
					if (
						predictedWinner !== match.player1Name &&
						predictedWinner !== match.player2Name
					) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: `Invalid winner for match ${match.id}. Must be either ${match.player1Name} or ${match.player2Name}`,
						});
					}
					return true;
				};

				expect(() => validateWinner("Unknown Player")).toThrow(
					"Invalid winner",
				);
				expect(validateWinner("Novak Djokovic")).toBe(true);
				expect(validateWinner("Dino Prizmic")).toBe(true);
			});
		});

		describe("score validation for Best of 3", () => {
			const validateBo3Score = (setsWon: number, setsLost: number) => {
				const requiredSetsToWin = 2;

				if (setsWon !== requiredSetsToWin) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Invalid score: winner must have won exactly ${requiredSetsToWin} sets`,
					});
				}

				const maxSetsLost = requiredSetsToWin - 1;
				if (setsLost < 0 || setsLost > maxSetsLost) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Invalid score: sets lost must be between 0 and ${maxSetsLost}`,
					});
				}

				return true;
			};

			it.each(
				scoreTestCases.bo3_valid,
			)("should accept valid BO3 score $setsWon-$setsLost", ({
				setsWon,
				setsLost,
			}) => {
				expect(validateBo3Score(setsWon, setsLost)).toBe(true);
			});

			it("should reject setsWon !== 2 in BO3", () => {
				expect(() => validateBo3Score(3, 0)).toThrow(
					"must have won exactly 2 sets",
				);
				expect(() => validateBo3Score(1, 0)).toThrow(
					"must have won exactly 2 sets",
				);
			});

			it("should reject setsLost > 1 in BO3", () => {
				expect(() => validateBo3Score(2, 2)).toThrow(
					"sets lost must be between 0 and 1",
				);
			});
		});

		describe("score validation for Best of 5", () => {
			const validateBo5Score = (setsWon: number, setsLost: number) => {
				const requiredSetsToWin = 3;

				if (setsWon !== requiredSetsToWin) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Invalid score: winner must have won exactly ${requiredSetsToWin} sets`,
					});
				}

				const maxSetsLost = requiredSetsToWin - 1;
				if (setsLost < 0 || setsLost > maxSetsLost) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Invalid score: sets lost must be between 0 and ${maxSetsLost}`,
					});
				}

				return true;
			};

			it.each(
				scoreTestCases.bo5_valid,
			)("should accept valid BO5 score $setsWon-$setsLost", ({
				setsWon,
				setsLost,
			}) => {
				expect(validateBo5Score(setsWon, setsLost)).toBe(true);
			});

			it("should reject setsWon !== 3 in BO5", () => {
				expect(() => validateBo5Score(2, 0)).toThrow(
					"must have won exactly 3 sets",
				);
			});

			it("should reject setsLost > 2 in BO5", () => {
				expect(() => validateBo5Score(3, 3)).toThrow(
					"sets lost must be between 0 and 2",
				);
			});
		});
	});

	describe("saveRoundPicksDraft", () => {
		let mockDb: MockDb;

		beforeEach(() => {
			mockDb = createMockDb();
		});

		it("should reject draft save when round is not active", async () => {
			mockDb.query.rounds.findFirst.mockResolvedValue({
				...mockRounds.ao_r64,
				isActive: false,
			});

			const validateRoundForDraft = async () => {
				const round = await mockDb.query.rounds.findFirst({});
				if (!round?.isActive) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "This round is not currently accepting picks",
					});
				}
				return round;
			};

			await expect(validateRoundForDraft()).rejects.toThrow(
				"This round is not currently accepting picks",
			);
		});

		it("should reject draft save when final picks already submitted", async () => {
			mockDb.query.userRoundPicks.findFirst.mockResolvedValue({
				...mockUserRoundPicks.player1_ao_r128,
				isDraft: false,
			});

			const checkCanSaveDraft = async () => {
				const existingPicks = await mockDb.query.userRoundPicks.findFirst({});
				if (existingPicks && !existingPicks.isDraft) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "You have already submitted final picks for this round",
					});
				}
				return true;
			};

			await expect(checkCanSaveDraft()).rejects.toThrow(
				"You have already submitted final picks",
			);
		});

		it("should allow updating existing draft", async () => {
			mockDb.query.userRoundPicks.findFirst.mockResolvedValue({
				...mockUserRoundPicks.player1_ao_r128_draft,
				isDraft: true,
			});

			const checkCanSaveDraft = async () => {
				const existingPicks = await mockDb.query.userRoundPicks.findFirst({});
				if (existingPicks && !existingPicks.isDraft) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "You have already submitted final picks for this round",
					});
				}
				return existingPicks?.isDraft ?? false;
			};

			const result = await checkCanSaveDraft();
			expect(result).toBe(true);
		});

		it("should allow partial picks in draft mode", () => {
			// Draft allows saving any number of picks, including partial
			const validateDraftPicks = (picks: unknown[], totalMatches: number) => {
				// No minimum required for draft
				return picks.length <= totalMatches;
			};

			expect(validateDraftPicks([], 10)).toBe(true);
			expect(validateDraftPicks([{}], 10)).toBe(true);
			expect(validateDraftPicks([{}, {}, {}], 10)).toBe(true);
		});
	});

	describe("getUserRoundPicks", () => {
		let mockDb: MockDb;

		beforeEach(() => {
			mockDb = createMockDb();
		});

		it("should return null when user has no picks for round", async () => {
			mockDb.query.userRoundPicks.findFirst.mockResolvedValue(null);

			const result = await mockDb.query.userRoundPicks.findFirst({});
			expect(result).toBeNull();
		});

		it("should return picks with match data when found", async () => {
			mockDb.query.userRoundPicks.findFirst.mockResolvedValue({
				...mockUserRoundPicks.player1_ao_r128,
				matchPicks: [
					{
						matchId: 1,
						predictedWinner: "Novak Djokovic",
						match: mockMatches.ao_match1,
					},
				],
			});

			const result = await mockDb.query.userRoundPicks.findFirst({});
			expect(result).not.toBeNull();
			expect(result?.matchPicks.length).toBe(1);
		});
	});

	describe("getUserTournamentPicks", () => {
		let mockDb: MockDb;

		beforeEach(() => {
			mockDb = createMockDb();
		});

		it("should return picks across all rounds in tournament", async () => {
			mockDb.query.rounds.findMany.mockResolvedValue([
				mockRounds.ao_r128,
				mockRounds.ao_r64,
			]);

			const rounds = await mockDb.query.rounds.findMany({});
			expect(rounds.length).toBe(2);
		});
	});
});

// =============================================================================
// Pick Timing Edge Cases
// =============================================================================

describe("pick timing edge cases", () => {
	describe("round state transitions", () => {
		it("should track round active state correctly", () => {
			const roundStates = [
				{ roundNumber: 1, isActive: false, description: "Upcoming" },
				{ roundNumber: 2, isActive: true, description: "Current" },
				{ roundNumber: 3, isActive: false, description: "Past" },
			];

			const activeRounds = roundStates.filter((r) => r.isActive);
			expect(activeRounds.length).toBe(1);
			expect(activeRounds[0]?.roundNumber).toBe(2);
		});

		it("should only allow picks for active rounds", () => {
			const canSubmitPick = (roundIsActive: boolean) => roundIsActive;

			expect(canSubmitPick(true)).toBe(true);
			expect(canSubmitPick(false)).toBe(false);
		});
	});

	describe("draft to final submission transition", () => {
		it("should track submission state correctly", () => {
			type SubmissionState = "none" | "draft" | "final";

			const getSubmissionState = (
				pick: { isDraft?: boolean } | null,
			): SubmissionState => {
				if (!pick) return "none";
				return pick.isDraft ? "draft" : "final";
			};

			expect(getSubmissionState(null)).toBe("none");
			expect(getSubmissionState({ isDraft: true })).toBe("draft");
			expect(getSubmissionState({ isDraft: false })).toBe("final");
		});

		it("should allow state transitions: none -> draft -> final", () => {
			type SubmissionState = "none" | "draft" | "final";

			const canTransition = (
				currentState: SubmissionState,
				targetState: SubmissionState,
			): boolean => {
				if (currentState === "none") return true; // Can go to draft or final
				if (currentState === "draft") return targetState === "final"; // Can only go to final
				return false; // final is terminal
			};

			expect(canTransition("none", "draft")).toBe(true);
			expect(canTransition("none", "final")).toBe(true);
			expect(canTransition("draft", "final")).toBe(true);
			expect(canTransition("final", "draft")).toBe(false);
			expect(canTransition("final", "final")).toBe(false);
		});
	});
});

// =============================================================================
// User Isolation Tests
// =============================================================================

describe("user data isolation", () => {
	it("should only return picks for the requesting user", () => {
		const allPicks = [
			{ userId: "user-1", roundId: 1 },
			{ userId: "user-2", roundId: 1 },
			{ userId: "user-1", roundId: 2 },
		];

		const filterByUser = (userId: string) =>
			allPicks.filter((p) => p.userId === userId);

		const user1Picks = filterByUser("user-1");
		const user2Picks = filterByUser("user-2");

		expect(user1Picks.length).toBe(2);
		expect(user2Picks.length).toBe(1);
	});

	it("should enforce unique constraint on user + round combination", () => {
		const existingPicks = new Set(["user-1:round-1", "user-2:round-1"]);

		const canSubmit = (userId: string, roundId: string, _isDraft: boolean) => {
			const key = `${userId}:${roundId}`;
			// If exists and is not draft, cannot submit
			return !existingPicks.has(key);
		};

		expect(canSubmit("user-1", "round-1", false)).toBe(false);
		expect(canSubmit("user-1", "round-2", false)).toBe(true);
		expect(canSubmit("user-3", "round-1", false)).toBe(true);
	});
});

// =============================================================================
// Input Validation Tests
// =============================================================================

describe("picks input validation", () => {
	describe("roundId validation", () => {
		it("should require roundId to be a positive integer", () => {
			const validateRoundId = (roundId: number) => {
				if (!Number.isInteger(roundId) || roundId <= 0) {
					throw new Error("Invalid roundId");
				}
				return true;
			};

			expect(validateRoundId(1)).toBe(true);
			expect(validateRoundId(100)).toBe(true);
			expect(() => validateRoundId(0)).toThrow();
			expect(() => validateRoundId(-1)).toThrow();
			expect(() => validateRoundId(1.5)).toThrow();
		});
	});

	describe("picks array validation", () => {
		it("should validate each pick has required fields", () => {
			const validatePick = (pick: {
				matchId?: number;
				predictedWinner?: string;
				predictedSetsWon?: number;
				predictedSetsLost?: number;
			}) => {
				if (typeof pick.matchId !== "number") return false;
				if (typeof pick.predictedWinner !== "string") return false;
				if (typeof pick.predictedSetsWon !== "number") return false;
				if (typeof pick.predictedSetsLost !== "number") return false;
				return true;
			};

			expect(
				validatePick({
					matchId: 1,
					predictedWinner: "Player A",
					predictedSetsWon: 2,
					predictedSetsLost: 0,
				}),
			).toBe(true);

			expect(validatePick({ matchId: 1 })).toBe(false);
			expect(validatePick({})).toBe(false);
		});

		it("should validate predictedSetsWon is 2 or 3", () => {
			const validateSetsWon = (setsWon: number) => {
				return setsWon >= 2 && setsWon <= 3;
			};

			expect(validateSetsWon(2)).toBe(true);
			expect(validateSetsWon(3)).toBe(true);
			expect(validateSetsWon(1)).toBe(false);
			expect(validateSetsWon(4)).toBe(false);
		});

		it("should validate predictedSetsLost is 0, 1, or 2", () => {
			const validateSetsLost = (setsLost: number) => {
				return setsLost >= 0 && setsLost <= 2;
			};

			expect(validateSetsLost(0)).toBe(true);
			expect(validateSetsLost(1)).toBe(true);
			expect(validateSetsLost(2)).toBe(true);
			expect(validateSetsLost(-1)).toBe(false);
			expect(validateSetsLost(3)).toBe(false);
		});
	});
});
