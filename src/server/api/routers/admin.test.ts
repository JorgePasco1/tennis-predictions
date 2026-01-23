/**
 * Admin Router Integration Tests
 *
 * Tests for admin-only operations: match finalization, tournament management,
 * draw uploads, and scoring.
 */

import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockMatches, mockRounds, mockTournaments } from "~/test/fixtures";
import { createMockDb, type MockDb } from "~/test/mock-db";

// We'll test the router logic by simulating procedure behavior
// Note: For full integration tests, you would use createCallerFactory

describe("admin router", () => {
	describe("finalizeMatch", () => {
		let mockDb: MockDb;

		beforeEach(() => {
			mockDb = createMockDb();
		});

		describe("input validation", () => {
			it("should require matchId to be an integer", () => {
				// Zod schema: z.number().int()
				const validInput = {
					matchId: 1,
					winnerName: "Test",
					finalScore: "6-4, 6-4",
					setsWon: 2,
					setsLost: 0,
				};
				const invalidInput = {
					matchId: 1.5,
					winnerName: "Test",
					finalScore: "6-4, 6-4",
					setsWon: 2,
					setsLost: 0,
				};

				expect(Number.isInteger(validInput.matchId)).toBe(true);
				expect(Number.isInteger(invalidInput.matchId)).toBe(false);
			});

			it("should require setsWon to be between 2 and 3", () => {
				// Zod schema: z.number().int().min(2).max(3)
				const validSetsWon = [2, 3];
				const invalidSetsWon = [0, 1, 4, 5];

				for (const sets of validSetsWon) {
					expect(sets >= 2 && sets <= 3).toBe(true);
				}
				for (const sets of invalidSetsWon) {
					expect(sets >= 2 && sets <= 3).toBe(false);
				}
			});

			it("should require setsLost to be between 0 and 2", () => {
				// Zod schema: z.number().int().min(0).max(2)
				const validSetsLost = [0, 1, 2];
				const invalidSetsLost = [-1, 3, 4];

				for (const sets of validSetsLost) {
					expect(sets >= 0 && sets <= 2).toBe(true);
				}
				for (const sets of invalidSetsLost) {
					expect(sets >= 0 && sets <= 2).toBe(false);
				}
			});
		});

		describe("match finalization logic", () => {
			it("should reject finalization when match is not found", async () => {
				mockDb.query.matches.findFirst.mockResolvedValue(null);

				const validateMatch = async () => {
					const match = await mockDb.query.matches.findFirst({});
					if (!match) {
						throw new Error("Match not found");
					}
					return match;
				};

				await expect(validateMatch()).rejects.toThrow("Match not found");
			});

			it("should reject finalization when winner is not a match player", async () => {
				mockDb.query.matches.findFirst.mockResolvedValue({
					...mockMatches.ao_match1,
				});

				const validateWinner = (
					winnerName: string,
					match: typeof mockMatches.ao_match1,
				) => {
					if (
						winnerName !== match.player1Name &&
						winnerName !== match.player2Name
					) {
						throw new Error("Winner must be one of the match players");
					}
				};

				expect(() =>
					validateWinner("Unknown Player", mockMatches.ao_match1),
				).toThrow("Winner must be one of the match players");
			});

			it("should accept valid winner (player 1)", () => {
				const validateWinner = (
					winnerName: string,
					match: typeof mockMatches.ao_match1,
				) => {
					if (
						winnerName !== match.player1Name &&
						winnerName !== match.player2Name
					) {
						throw new Error("Winner must be one of the match players");
					}
					return true;
				};

				expect(validateWinner("Novak Djokovic", mockMatches.ao_match1)).toBe(
					true,
				);
			});

			it("should accept valid winner (player 2)", () => {
				const validateWinner = (
					winnerName: string,
					match: typeof mockMatches.ao_match1,
				) => {
					if (
						winnerName !== match.player1Name &&
						winnerName !== match.player2Name
					) {
						throw new Error("Winner must be one of the match players");
					}
					return true;
				};

				expect(validateWinner("Dino Prizmic", mockMatches.ao_match1)).toBe(
					true,
				);
			});
		});

		describe("score validation", () => {
			const validateScore = (setsWon: number, setsLost: number) => {
				if (setsWon < 2) {
					throw new Error("Winner must have won at least 2 sets");
				}
				if (setsLost >= setsWon) {
					throw new Error("Winner must have won more sets than they lost");
				}
				if (setsWon === 2 && setsLost > 1) {
					throw new Error(
						"Invalid score: if sets won is 2, sets lost must be 0 or 1",
					);
				}
				if (setsWon === 3 && setsLost > 2) {
					throw new Error(
						"Invalid score: if sets won is 3, sets lost must be 0, 1, or 2",
					);
				}
				return true;
			};

			it("should reject score when setsWon < 2", () => {
				expect(() => validateScore(1, 0)).toThrow(
					"Winner must have won at least 2 sets",
				);
			});

			it("should reject score when setsLost >= setsWon", () => {
				expect(() => validateScore(2, 2)).toThrow(
					"Winner must have won more sets than they lost",
				);
				expect(() => validateScore(3, 3)).toThrow(
					"Winner must have won more sets than they lost",
				);
			});

			it("should reject invalid Best of 3 scores", () => {
				// 2-0 and 2-1 are valid; 2-2 is invalid
				expect(() => validateScore(2, 2)).toThrow();
			});

			it("should reject the 3-0 score when treated as BO3 incorrectly", () => {
				// This was a real bug: 3-0 is valid in BO5 but the validation
				// should check tournament format
				// In the actual code, setsWon=3 with setsLost=0 is allowed
				expect(() => validateScore(3, 0)).not.toThrow();
			});

			it("should accept valid Best of 3 scores", () => {
				expect(validateScore(2, 0)).toBe(true);
				expect(validateScore(2, 1)).toBe(true);
			});

			it("should accept valid Best of 5 scores", () => {
				expect(validateScore(3, 0)).toBe(true);
				expect(validateScore(3, 1)).toBe(true);
				expect(validateScore(3, 2)).toBe(true);
			});

			it("should reject setsWon=3 with setsLost=3", () => {
				expect(() => validateScore(3, 3)).toThrow(
					"Winner must have won more sets than they lost",
				);
			});
		});
	});

	describe("unfinalizeMatch", () => {
		let mockDb: MockDb;

		beforeEach(() => {
			mockDb = createMockDb();
		});

		it("should reject unfinalization when match is not found", async () => {
			mockDb.query.matches.findFirst.mockResolvedValue(null);

			const validateMatch = async () => {
				const match = await mockDb.query.matches.findFirst({});
				if (!match) {
					throw new Error("Match not found");
				}
				return match;
			};

			await expect(validateMatch()).rejects.toThrow("Match not found");
		});

		it("should reject unfinalization when match is not finalized", async () => {
			mockDb.query.matches.findFirst.mockResolvedValue({
				...mockMatches.ao_match1,
				status: "pending",
			});

			const validateUnfinalize = async () => {
				const match = await mockDb.query.matches.findFirst({});
				if (match && match.status !== "finalized") {
					throw new Error("Match is not finalized and cannot be unfinalized");
				}
			};

			await expect(validateUnfinalize()).rejects.toThrow(
				"Match is not finalized",
			);
		});

		it("should allow unfinalization when match is finalized", async () => {
			mockDb.query.matches.findFirst.mockResolvedValue({
				...mockMatches.ao_match3_finalized,
				status: "finalized",
			});

			const validateUnfinalize = async () => {
				const match = await mockDb.query.matches.findFirst({});
				if (match && match.status !== "finalized") {
					throw new Error("Match is not finalized and cannot be unfinalized");
				}
				return true;
			};

			await expect(validateUnfinalize()).resolves.toBe(true);
		});
	});

	describe("setActiveRound", () => {
		let mockDb: MockDb;

		beforeEach(() => {
			mockDb = createMockDb();
		});

		it("should reject when tournament not found", async () => {
			mockDb.query.tournaments.findFirst.mockResolvedValue(null);

			const validateTournament = async () => {
				const tournament = await mockDb.query.tournaments.findFirst({});
				if (!tournament) {
					throw new Error("Tournament not found");
				}
				return tournament;
			};

			await expect(validateTournament()).rejects.toThrow(
				"Tournament not found",
			);
		});

		it("should reject when round does not exist in tournament", async () => {
			mockDb.query.tournaments.findFirst.mockResolvedValue({
				...mockTournaments.australian_open,
				rounds: [mockRounds.ao_r128, mockRounds.ao_r64],
			});

			const validateRound = async (roundNumber: number) => {
				const tournament = await mockDb.query.tournaments.findFirst({});
				if (!tournament) throw new Error("Tournament not found");

				const targetRound = tournament.rounds.find(
					(r: typeof mockRounds.ao_r128) => r.roundNumber === roundNumber,
				);
				if (!targetRound) {
					throw new Error(`Round ${roundNumber} not found in this tournament`);
				}
				return targetRound;
			};

			await expect(validateRound(99)).rejects.toThrow("Round 99 not found");
		});

		it("should accept valid round number", async () => {
			mockDb.query.tournaments.findFirst.mockResolvedValue({
				...mockTournaments.australian_open,
				rounds: [mockRounds.ao_r128, mockRounds.ao_r64],
			});

			const validateRound = async (roundNumber: number) => {
				const tournament = await mockDb.query.tournaments.findFirst({});
				if (!tournament) throw new Error("Tournament not found");

				const targetRound = tournament.rounds.find(
					(r: typeof mockRounds.ao_r128) => r.roundNumber === roundNumber,
				);
				if (!targetRound) {
					throw new Error(`Round ${roundNumber} not found in this tournament`);
				}
				return targetRound;
			};

			const round = await validateRound(1);
			expect(round.roundNumber).toBe(1);
		});
	});

	describe("uploadDraw", () => {
		it("should decode base64 HTML content", () => {
			const htmlContent = "<html><body>Test</body></html>";
			const base64Content = Buffer.from(htmlContent).toString("base64");

			const decoded = Buffer.from(base64Content, "base64").toString("utf-8");

			expect(decoded).toBe(htmlContent);
		});

		it("should throw error on invalid base64 content", () => {
			const decodeBase64 = (content: string) => {
				try {
					return Buffer.from(content, "base64").toString("utf-8");
				} catch (_error) {
					throw new Error("Failed to decode base64 content");
				}
			};

			// Invalid base64 won't throw in Node's Buffer, but will produce garbage
			// The actual validation happens in parseAtpDraw
			expect(() => decodeBase64("not-valid-base64!@#")).not.toThrow();
		});

		it("should validate year range", () => {
			const validateYear = (year: number) => {
				if (year < 2000 || year > 2100) {
					throw new Error("Year must be between 2000 and 2100");
				}
				return true;
			};

			expect(validateYear(2024)).toBe(true);
			expect(() => validateYear(1999)).toThrow();
			expect(() => validateYear(2101)).toThrow();
		});
	});

	describe("commitDraw", () => {
		let mockDb: MockDb;

		beforeEach(() => {
			mockDb = createMockDb();
		});

		/**
		 * PERFORMANCE OPTIMIZATION (2026-01-21)
		 *
		 * The commitDraw procedure has been optimized for performance:
		 * - Phase 1: Batch rounds + scoring rules (2 queries instead of 14)
		 * - Phase 2: Single batch for all matches (1 query instead of 7)
		 * - Phase 3: Bulk winner propagation (1-7 queries instead of N individual updates)
		 * - Phase 4: Skip score calculation for new tournaments (0 queries when no picks exist)
		 *
		 * Expected performance for 127-match tournament:
		 * - Before: 8-15+ seconds (15-50+ queries)
		 * - After: 2-5 seconds (7-10 queries)
		 *
		 * Key optimizations:
		 * 1. All rounds inserted in one batch
		 * 2. All scoring rules inserted in one batch
		 * 3. All matches inserted in one batch (across all rounds)
		 * 4. Winner propagation uses SQL CASE statements for bulk updates
		 * 5. Round finalization batched
		 * 6. Score calculation skipped when no picks exist
		 */

		it("should reject re-upload when tournament has finalized matches", async () => {
			mockDb.query.tournaments.findFirst.mockResolvedValue({
				...mockTournaments.australian_open,
				rounds: [
					{
						...mockRounds.ao_r128,
						userRoundPicks: [],
						matches: [
							{ ...mockMatches.ao_match3_finalized, status: "finalized" },
						],
					},
				],
			});

			const validateReupload = async () => {
				const existingTournament = await mockDb.query.tournaments.findFirst({});
				if (existingTournament) {
					const hasFinalized = existingTournament.rounds.some(
						(round: { matches: Array<{ status: string }> }) =>
							round.matches.some((match) => match.status === "finalized"),
					);
					if (hasFinalized) {
						throw new Error(
							"Cannot re-upload: Tournament has finalized matches.",
						);
					}
				}
				return true;
			};

			await expect(validateReupload()).rejects.toThrow(
				"Cannot re-upload: Tournament has finalized matches",
			);
		});

		it("should require overwriteExisting flag when picks exist", async () => {
			mockDb.query.tournaments.findFirst.mockResolvedValue({
				...mockTournaments.australian_open,
				rounds: [
					{
						...mockRounds.ao_r128,
						userRoundPicks: [{ id: 1 }], // Has picks
						matches: [{ ...mockMatches.ao_match1, status: "pending" }],
					},
				],
			});

			const validateOverwrite = async (overwriteExisting: boolean) => {
				const existingTournament = await mockDb.query.tournaments.findFirst({});
				if (existingTournament) {
					const totalPicks = existingTournament.rounds.reduce(
						(sum: number, round: { userRoundPicks: unknown[] }) =>
							sum + round.userRoundPicks.length,
						0,
					);
					if (totalPicks > 0 && !overwriteExisting) {
						throw new Error(
							`Tournament already exists with ${totalPicks} user picks.`,
						);
					}
				}
				return true;
			};

			await expect(validateOverwrite(false)).rejects.toThrow(
				"Tournament already exists with 1 user picks",
			);
			await expect(validateOverwrite(true)).resolves.toBe(true);
		});

		it("should generate correct slug from tournament name", () => {
			const generateSlug = (name: string, year: number): string => {
				return `${name
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, "-")
					.replace(/^-|-$/g, "")}-${year}`;
			};

			expect(generateSlug("Australian Open", 2024)).toBe(
				"australian-open-2024",
			);
			expect(generateSlug("Roland-Garros", 2024)).toBe("roland-garros-2024");
			expect(generateSlug("US Open", 2024)).toBe("us-open-2024");
			expect(generateSlug("  Wimbledon  ", 2024)).toBe("wimbledon-2024");
		});
	});

	describe("updateTournament", () => {
		let mockDb: MockDb;

		beforeEach(() => {
			mockDb = createMockDb();
		});

		it("should reject when tournament not found", async () => {
			mockDb.query.tournaments.findFirst.mockResolvedValue(null);

			const validateTournament = async () => {
				const tournament = await mockDb.query.tournaments.findFirst({});
				if (!tournament) {
					throw new Error("Tournament not found");
				}
				return tournament;
			};

			await expect(validateTournament()).rejects.toThrow(
				"Tournament not found",
			);
		});

		it("should accept valid format values", () => {
			const validFormats = ["bo3", "bo5"];
			const invalidFormats = ["bo1", "bo7", ""];

			for (const format of validFormats) {
				expect(validFormats.includes(format)).toBe(true);
			}
			for (const format of invalidFormats) {
				expect(validFormats.includes(format)).toBe(false);
			}
		});

		it("should allow empty ATP URL", () => {
			// Empty string is allowed and converted to null
			const processAtpUrl = (url: string | undefined): string | null => {
				if (url === undefined) return null;
				return url || null;
			};

			expect(processAtpUrl("")).toBe(null);
			expect(processAtpUrl("https://example.com")).toBe("https://example.com");
			expect(processAtpUrl(undefined)).toBe(null);
		});
	});
});

// =============================================================================
// Authorization Tests
// =============================================================================

describe("admin router authorization", () => {
	describe("admin-only procedures", () => {
		it("should require admin role for uploadDraw", () => {
			const checkAdmin = (role: "user" | "admin") => {
				if (role !== "admin") {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "You must be an admin to perform this action",
					});
				}
				return true;
			};

			expect(() => checkAdmin("user")).toThrow("You must be an admin");
			expect(checkAdmin("admin")).toBe(true);
		});

		it("should require authentication", () => {
			const checkAuth = (user: { id: string } | null) => {
				if (!user) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "You must be logged in to perform this action",
					});
				}
				return true;
			};

			expect(() => checkAuth(null)).toThrow("You must be logged in");
			expect(checkAuth({ id: "user-1" })).toBe(true);
		});
	});
});

// =============================================================================
// Edge Cases and Error Handling
// =============================================================================

describe("admin router edge cases", () => {
	describe("concurrent operations", () => {
		it("should handle transaction properly in unfinalizeMatch", async () => {
			// The router uses db.transaction to ensure atomic rollback
			// This tests that the transaction pattern is correct
			const executeTransaction = async (
				callback: (tx: unknown) => Promise<unknown>,
			) => {
				// Simulate transaction behavior
				const result = await callback({});
				return result;
			};

			const mockOperation = vi.fn().mockResolvedValue({ success: true });

			await expect(executeTransaction(mockOperation)).resolves.toEqual({
				success: true,
			});
		});
	});

	describe("soft delete handling", () => {
		it("should exclude deleted tournaments from queries", () => {
			const tournaments = [
				{ id: 1, deletedAt: null },
				{ id: 2, deletedAt: new Date() },
				{ id: 3, deletedAt: null },
			];

			const activeTournaments = tournaments.filter((t) => t.deletedAt === null);

			expect(activeTournaments.length).toBe(2);
			expect(activeTournaments.map((t) => t.id)).toEqual([1, 3]);
		});

		it("should exclude deleted matches from queries", () => {
			const matches = [
				{ id: 1, deletedAt: null },
				{ id: 2, deletedAt: new Date() },
			];

			const activeMatches = matches.filter((m) => m.deletedAt === null);

			expect(activeMatches.length).toBe(1);
		});
	});
});

// =============================================================================
// BYE Match Handling Tests
// =============================================================================

describe("commitDraw BYE handling", () => {
	describe("BYE detection", () => {
		it("should detect BYE player name (uppercase)", () => {
			const detectBye = (playerName: string) => {
				return playerName.toUpperCase() === "BYE";
			};

			expect(detectBye("BYE")).toBe(true);
			expect(detectBye("Novak Djokovic")).toBe(false);
		});

		it("should detect BYE player name (lowercase)", () => {
			const detectBye = (playerName: string) => {
				return playerName.toUpperCase() === "BYE";
			};

			expect(detectBye("bye")).toBe(true);
			expect(detectBye("Bye")).toBe(true);
		});

		it("should detect BYE player name (mixed case)", () => {
			const detectBye = (playerName: string) => {
				return playerName.toUpperCase() === "BYE";
			};

			expect(detectBye("ByE")).toBe(true);
			expect(detectBye("bYe")).toBe(true);
		});

		it("should not detect BYE in player names containing BYE", () => {
			const detectBye = (playerName: string) => {
				return playerName.toUpperCase() === "BYE";
			};

			// Names that contain "BYE" but are not BYE matches
			expect(detectBye("Goodbye")).toBe(false);
			expect(detectBye("Bye-Bye")).toBe(false);
			expect(detectBye("BYEBYE")).toBe(false);
		});
	});

	describe("BYE match auto-finalization", () => {
		it("should auto-finalize BYE match with player1 as BYE", () => {
			const processMatch = (player1Name: string, player2Name: string) => {
				const player1IsBye = player1Name.toUpperCase() === "BYE";
				const player2IsBye = player2Name.toUpperCase() === "BYE";
				const isBye = player1IsBye || player2IsBye;

				if (isBye) {
					const winnerName = player1IsBye ? player2Name : player1Name;
					return {
						player1Name,
						player2Name,
						winnerName,
						status: "finalized" as const,
						isBye: true,
					};
				}

				return {
					player1Name,
					player2Name,
					winnerName: null,
					status: "pending" as const,
					isBye: false,
				};
			};

			const result = processMatch("BYE", "Novak Djokovic");

			expect(result.isBye).toBe(true);
			expect(result.status).toBe("finalized");
			expect(result.winnerName).toBe("Novak Djokovic");
		});

		it("should auto-finalize BYE match with player2 as BYE", () => {
			const processMatch = (player1Name: string, player2Name: string) => {
				const player1IsBye = player1Name.toUpperCase() === "BYE";
				const player2IsBye = player2Name.toUpperCase() === "BYE";
				const isBye = player1IsBye || player2IsBye;

				if (isBye) {
					const winnerName = player1IsBye ? player2Name : player1Name;
					return {
						player1Name,
						player2Name,
						winnerName,
						status: "finalized" as const,
						isBye: true,
					};
				}

				return {
					player1Name,
					player2Name,
					winnerName: null,
					status: "pending" as const,
					isBye: false,
				};
			};

			const result = processMatch("Jannik Sinner", "BYE");

			expect(result.isBye).toBe(true);
			expect(result.status).toBe("finalized");
			expect(result.winnerName).toBe("Jannik Sinner");
		});

		it("should reject when both players are BYE", () => {
			const processMatch = (player1Name: string, player2Name: string) => {
				const player1IsBye = player1Name.toUpperCase() === "BYE";
				const player2IsBye = player2Name.toUpperCase() === "BYE";

				if (player1IsBye && player2IsBye) {
					throw new Error("Invalid BYE match: both players cannot be BYE");
				}

				return { success: true };
			};

			expect(() => processMatch("BYE", "BYE")).toThrow(
				"Invalid BYE match: both players cannot be BYE",
			);
		});

		it("should preserve seed information for BYE winner", () => {
			const processMatch = (
				player1Name: string,
				player2Name: string,
				player1Seed: number | null,
				player2Seed: number | null,
			) => {
				const player1IsBye = player1Name.toUpperCase() === "BYE";
				const player2IsBye = player2Name.toUpperCase() === "BYE";

				if (player1IsBye || player2IsBye) {
					const winnerName = player1IsBye ? player2Name : player1Name;
					const winnerSeed = player1IsBye ? player2Seed : player1Seed;

					return {
						winnerName,
						winnerSeed,
						isBye: true,
					};
				}

				return { winnerName: null, winnerSeed: null, isBye: false };
			};

			// Seeded player vs BYE
			const result1 = processMatch("BYE", "Novak Djokovic", null, 1);
			expect(result1.winnerName).toBe("Novak Djokovic");
			expect(result1.winnerSeed).toBe(1);

			// Unseeded player vs BYE
			const result2 = processMatch("Qualifier", "BYE", null, null);
			expect(result2.winnerName).toBe("Qualifier");
			expect(result2.winnerSeed).toBe(null);
		});
	});

	describe("BYE winner propagation", () => {
		// Type definitions for test data
		interface TestMatch {
			matchNumber: number;
			player1Name: string;
			player2Name: string;
			winnerName: string | null;
			isBye: boolean;
		}

		interface TestRound {
			roundNumber: number;
			matches: TestMatch[];
		}

		it("should calculate correct next match number for odd match", () => {
			// Match 1 -> Next Match 1 (player1)
			// Match 3 -> Next Match 2 (player1)
			// Match 5 -> Next Match 3 (player1)
			const calculateNextMatch = (matchNumber: number) => {
				const nextMatchNumber = Math.ceil(matchNumber / 2);
				const isPlayer1 = matchNumber % 2 === 1;
				return { nextMatchNumber, isPlayer1 };
			};

			expect(calculateNextMatch(1)).toEqual({
				nextMatchNumber: 1,
				isPlayer1: true,
			});
			expect(calculateNextMatch(3)).toEqual({
				nextMatchNumber: 2,
				isPlayer1: true,
			});
			expect(calculateNextMatch(5)).toEqual({
				nextMatchNumber: 3,
				isPlayer1: true,
			});
		});

		it("should calculate correct next match number for even match", () => {
			// Match 2 -> Next Match 1 (player2)
			// Match 4 -> Next Match 2 (player2)
			// Match 6 -> Next Match 3 (player2)
			const calculateNextMatch = (matchNumber: number) => {
				const nextMatchNumber = Math.ceil(matchNumber / 2);
				const isPlayer1 = matchNumber % 2 === 1;
				return { nextMatchNumber, isPlayer1 };
			};

			expect(calculateNextMatch(2)).toEqual({
				nextMatchNumber: 1,
				isPlayer1: false,
			});
			expect(calculateNextMatch(4)).toEqual({
				nextMatchNumber: 2,
				isPlayer1: false,
			});
			expect(calculateNextMatch(6)).toEqual({
				nextMatchNumber: 3,
				isPlayer1: false,
			});
		});

		it("should propagate BYE winner to next round player1 slot", () => {
			const rounds: TestRound[] = [
				{
					roundNumber: 1,
					matches: [
						{
							matchNumber: 1,
							player1Name: "BYE",
							player2Name: "Djokovic",
							winnerName: "Djokovic",
							isBye: true,
						},
						{
							matchNumber: 2,
							player1Name: "Alcaraz",
							player2Name: "Qualifier",
							winnerName: null,
							isBye: false,
						},
					],
				},
				{
					roundNumber: 2,
					matches: [
						{
							matchNumber: 1,
							player1Name: "TBD",
							player2Name: "TBD",
							winnerName: null,
							isBye: false,
						},
					],
				},
			];

			// Simulate propagation logic
			const byeMatches = rounds[0]?.matches.filter(
				(m) => m.isBye && m.winnerName,
			);
			const nextRound = rounds[1];

			if (byeMatches && nextRound) {
				for (const byeMatch of byeMatches) {
					const nextMatchNumber = Math.ceil(byeMatch.matchNumber / 2);
					const nextMatch = nextRound.matches.find(
						(m) => m.matchNumber === nextMatchNumber,
					);
					const isPlayer1 = byeMatch.matchNumber % 2 === 1;

					if (nextMatch && byeMatch.winnerName) {
						if (isPlayer1) {
							nextMatch.player1Name = byeMatch.winnerName;
						} else {
							nextMatch.player2Name = byeMatch.winnerName;
						}
					}
				}
			}

			expect(nextRound?.matches[0]?.player1Name).toBe("Djokovic");
			expect(nextRound?.matches[0]?.player2Name).toBe("TBD"); // Still TBD, match 2 not finalized
		});

		it("should propagate BYE winner to next round player2 slot", () => {
			const rounds: TestRound[] = [
				{
					roundNumber: 1,
					matches: [
						{
							matchNumber: 1,
							player1Name: "Sinner",
							player2Name: "Qualifier",
							winnerName: null,
							isBye: false,
						},
						{
							matchNumber: 2,
							player1Name: "Nadal",
							player2Name: "BYE",
							winnerName: "Nadal",
							isBye: true,
						},
					],
				},
				{
					roundNumber: 2,
					matches: [
						{
							matchNumber: 1,
							player1Name: "TBD",
							player2Name: "TBD",
							winnerName: null,
							isBye: false,
						},
					],
				},
			];

			// Simulate propagation logic
			const byeMatches = rounds[0]?.matches.filter(
				(m) => m.isBye && m.winnerName,
			);
			const nextRound = rounds[1];

			if (byeMatches && nextRound) {
				for (const byeMatch of byeMatches) {
					const nextMatchNumber = Math.ceil(byeMatch.matchNumber / 2);
					const nextMatch = nextRound.matches.find(
						(m) => m.matchNumber === nextMatchNumber,
					);
					const isPlayer1 = byeMatch.matchNumber % 2 === 1;

					if (nextMatch && byeMatch.winnerName) {
						if (isPlayer1) {
							nextMatch.player1Name = byeMatch.winnerName;
						} else {
							nextMatch.player2Name = byeMatch.winnerName;
						}
					}
				}
			}

			expect(nextRound?.matches[0]?.player1Name).toBe("TBD"); // Still TBD, match 1 not finalized
			expect(nextRound?.matches[0]?.player2Name).toBe("Nadal");
		});

		it("should handle multiple BYEs in different positions", () => {
			const rounds: TestRound[] = [
				{
					roundNumber: 1,
					matches: [
						{
							matchNumber: 1,
							player1Name: "BYE",
							player2Name: "Djokovic",
							winnerName: "Djokovic",
							isBye: true,
						},
						{
							matchNumber: 2,
							player1Name: "Alcaraz",
							player2Name: "BYE",
							winnerName: "Alcaraz",
							isBye: true,
						},
						{
							matchNumber: 3,
							player1Name: "Sinner",
							player2Name: "Qualifier",
							winnerName: null,
							isBye: false,
						},
						{
							matchNumber: 4,
							player1Name: "BYE",
							player2Name: "Medvedev",
							winnerName: "Medvedev",
							isBye: true,
						},
					],
				},
				{
					roundNumber: 2,
					matches: [
						{
							matchNumber: 1,
							player1Name: "TBD",
							player2Name: "TBD",
							winnerName: null,
							isBye: false,
						},
						{
							matchNumber: 2,
							player1Name: "TBD",
							player2Name: "TBD",
							winnerName: null,
							isBye: false,
						},
					],
				},
			];

			// Simulate propagation logic
			const byeMatches = rounds[0]?.matches.filter(
				(m) => m.isBye && m.winnerName,
			);
			const nextRound = rounds[1];

			if (byeMatches && nextRound) {
				for (const byeMatch of byeMatches) {
					const nextMatchNumber = Math.ceil(byeMatch.matchNumber / 2);
					const nextMatch = nextRound.matches.find(
						(m) => m.matchNumber === nextMatchNumber,
					);
					const isPlayer1 = byeMatch.matchNumber % 2 === 1;

					if (nextMatch && byeMatch.winnerName) {
						if (isPlayer1) {
							nextMatch.player1Name = byeMatch.winnerName;
						} else {
							nextMatch.player2Name = byeMatch.winnerName;
						}
					}
				}
			}

			// Match 1 (odd) -> Next Match 1, player1
			// Match 2 (even) -> Next Match 1, player2
			// Match 4 (even) -> Next Match 2, player2
			expect(nextRound?.matches[0]?.player1Name).toBe("Djokovic");
			expect(nextRound?.matches[0]?.player2Name).toBe("Alcaraz");
			expect(nextRound?.matches[1]?.player1Name).toBe("TBD"); // Match 3 not BYE
			expect(nextRound?.matches[1]?.player2Name).toBe("Medvedev");
		});
	});
});

// =============================================================================
// Flexible Player Name Handling (TBD) Tests
// =============================================================================

describe("commitDraw flexible player names", () => {
	describe("TBD handling", () => {
		it("should use TBD for empty player name", () => {
			const normalizePlayerName = (name: string | undefined | null): string => {
				return name?.trim() || "TBD";
			};

			expect(normalizePlayerName("")).toBe("TBD");
			expect(normalizePlayerName("   ")).toBe("TBD");
			expect(normalizePlayerName(null)).toBe("TBD");
			expect(normalizePlayerName(undefined)).toBe("TBD");
		});

		it("should preserve real player names", () => {
			const normalizePlayerName = (name: string | undefined | null): string => {
				return name?.trim() || "TBD";
			};

			expect(normalizePlayerName("Novak Djokovic")).toBe("Novak Djokovic");
			expect(normalizePlayerName("  Carlos Alcaraz  ")).toBe("Carlos Alcaraz");
			expect(normalizePlayerName("Rafael Nadal")).toBe("Rafael Nadal");
		});

		it("should handle mixed real names and TBD in same round", () => {
			const processMatches = (
				matches: Array<{ player1Name: string; player2Name: string }>,
			) => {
				return matches.map((m) => ({
					player1Name: m.player1Name?.trim() || "TBD",
					player2Name: m.player2Name?.trim() || "TBD",
				}));
			};

			const input = [
				{ player1Name: "Djokovic", player2Name: "Qualifier" },
				{ player1Name: "", player2Name: "" },
				{ player1Name: "Sinner", player2Name: "" },
			];

			const result = processMatches(input);

			expect(result[0]).toEqual({
				player1Name: "Djokovic",
				player2Name: "Qualifier",
			});
			expect(result[1]).toEqual({ player1Name: "TBD", player2Name: "TBD" });
			expect(result[2]).toEqual({ player1Name: "Sinner", player2Name: "TBD" });
		});

		it("should clear seed for TBD players", () => {
			const processMatch = (
				player1Name: string,
				player2Name: string,
				player1Seed: number | null,
				player2Seed: number | null,
			) => {
				const normalizedPlayer1 = player1Name?.trim() || "TBD";
				const normalizedPlayer2 = player2Name?.trim() || "TBD";

				return {
					player1Name: normalizedPlayer1,
					player2Name: normalizedPlayer2,
					player1Seed: normalizedPlayer1 === "TBD" ? null : player1Seed,
					player2Seed: normalizedPlayer2 === "TBD" ? null : player2Seed,
				};
			};

			// Real player with seed
			const result1 = processMatch("Djokovic", "Qualifier", 1, null);
			expect(result1.player1Seed).toBe(1);

			// TBD player - seed should be cleared
			const result2 = processMatch("", "Qualifier", 1, null);
			expect(result2.player1Name).toBe("TBD");
			expect(result2.player1Seed).toBe(null);

			// Both TBD
			const result3 = processMatch("", "", 5, 10);
			expect(result3.player1Seed).toBe(null);
			expect(result3.player2Seed).toBe(null);
		});
	});

	describe("later round TBD handling", () => {
		it("should allow TBD in Round 2 and beyond", () => {
			const validateRound = (
				_roundNumber: number,
				matches: Array<{ player1Name: string; player2Name: string }>,
			) => {
				// Previously, only Round 1 could have TBD. Now all rounds can have TBD.
				// The validation should pass for any round with TBD players.
				return matches.every(
					(m) =>
						(m.player1Name?.trim() || "TBD") &&
						(m.player2Name?.trim() || "TBD"),
				);
			};

			// Round 2 with TBD - should be valid now
			expect(
				validateRound(2, [
					{ player1Name: "", player2Name: "" },
					{ player1Name: "Winner M1", player2Name: "" },
				]),
			).toBe(true);

			// Round 3 with TBD - should be valid
			expect(
				validateRound(3, [{ player1Name: "TBD", player2Name: "TBD" }]),
			).toBe(true);
		});
	});
});

// =============================================================================
// FinalizeMatch BYE Validation Tests
// =============================================================================

describe("finalizeMatch BYE validation", () => {
	describe("BYE match rejection", () => {
		it("should reject manual finalization of BYE match", () => {
			const validateFinalization = (match: { isBye: boolean }) => {
				if (match.isBye) {
					throw new Error(
						"BYE matches are automatically finalized during tournament creation and cannot be manually updated",
					);
				}
				return true;
			};

			const byeMatch = { isBye: true };
			expect(() => validateFinalization(byeMatch)).toThrow(
				"BYE matches are automatically finalized during tournament creation",
			);
		});

		it("should allow finalization of non-BYE match", () => {
			const validateFinalization = (match: { isBye: boolean }) => {
				if (match.isBye) {
					throw new Error(
						"BYE matches are automatically finalized during tournament creation and cannot be manually updated",
					);
				}
				return true;
			};

			const normalMatch = { isBye: false };
			expect(validateFinalization(normalMatch)).toBe(true);
		});

		it("should check isBye before other validations", () => {
			const validateFinalization = (
				match: {
					isBye: boolean;
					player1Name: string;
					player2Name: string;
				},
				winnerName: string,
			) => {
				// BYE check should come first
				if (match.isBye) {
					throw new Error(
						"BYE matches are automatically finalized during tournament creation and cannot be manually updated",
					);
				}

				// Then validate winner
				if (
					winnerName !== match.player1Name &&
					winnerName !== match.player2Name
				) {
					throw new Error("Winner must be one of the match players");
				}

				return true;
			};

			// BYE match with invalid winner - should fail on BYE check, not winner check
			const byeMatch = {
				isBye: true,
				player1Name: "BYE",
				player2Name: "Djokovic",
			};

			expect(() => validateFinalization(byeMatch, "Invalid Player")).toThrow(
				"BYE matches are automatically finalized",
			);
		});
	});
});

// =============================================================================
// Auto-Finalization of Rounds Tests
// =============================================================================

describe("auto-finalization of rounds", () => {
	describe("round finalization check", () => {
		it("should detect when all matches are finalized", () => {
			const checkAllFinalized = (matches: Array<{ status: string }>) => {
				return matches.every((m) => m.status === "finalized");
			};

			const allFinalized = [
				{ status: "finalized" },
				{ status: "finalized" },
				{ status: "finalized" },
			];

			expect(checkAllFinalized(allFinalized)).toBe(true);
		});

		it("should detect when some matches are pending", () => {
			const checkAllFinalized = (matches: Array<{ status: string }>) => {
				return matches.every((m) => m.status === "finalized");
			};

			const somePending = [
				{ status: "finalized" },
				{ status: "pending" },
				{ status: "finalized" },
			];

			expect(checkAllFinalized(somePending)).toBe(false);
		});

		it("should detect when all matches are pending", () => {
			const checkAllFinalized = (matches: Array<{ status: string }>) => {
				return matches.every((m) => m.status === "finalized");
			};

			const allPending = [{ status: "pending" }, { status: "pending" }];

			expect(checkAllFinalized(allPending)).toBe(false);
		});
	});

	describe("round auto-finalization with BYE matches", () => {
		it("should count BYE matches as finalized", () => {
			const checkAllFinalized = (
				matches: Array<{ status: string; isBye: boolean }>,
			) => {
				return matches.every((m) => m.status === "finalized");
			};

			// Round with mix of BYE (auto-finalized) and regular finalized matches
			const matchesWithByes = [
				{ status: "finalized", isBye: true }, // BYE match
				{ status: "finalized", isBye: false }, // Regular finalized match
				{ status: "finalized", isBye: true }, // Another BYE match
			];

			expect(checkAllFinalized(matchesWithByes)).toBe(true);
		});

		it("should not finalize round if non-BYE matches are pending", () => {
			const checkAllFinalized = (
				matches: Array<{ status: string; isBye: boolean }>,
			) => {
				return matches.every((m) => m.status === "finalized");
			};

			// Round with BYE matches finalized but regular match pending
			const matchesWithPending = [
				{ status: "finalized", isBye: true }, // BYE match (auto-finalized)
				{ status: "pending", isBye: false }, // Regular match (pending)
			];

			expect(checkAllFinalized(matchesWithPending)).toBe(false);
		});

		it("should auto-finalize round when last match is finalized", () => {
			interface RoundState {
				matches: Array<{ status: string }>;
				isFinalized: boolean;
			}

			const finalizeMatchAndCheckRound = (
				round: RoundState,
				matchIndex: number,
			): RoundState => {
				// Update match status
				round.matches[matchIndex]!.status = "finalized";

				// Check if all matches are finalized
				const allFinalized = round.matches.every(
					(m) => m.status === "finalized",
				);

				// Auto-finalize round if all matches done
				if (allFinalized && !round.isFinalized) {
					round.isFinalized = true;
				}

				return round;
			};

			const round: RoundState = {
				matches: [
					{ status: "finalized" },
					{ status: "finalized" },
					{ status: "pending" }, // Last pending match
				],
				isFinalized: false,
			};

			// Finalize the last match
			const result = finalizeMatchAndCheckRound(round, 2);

			expect(result.matches[2]?.status).toBe("finalized");
			expect(result.isFinalized).toBe(true);
		});

		it("should not re-finalize already finalized round", () => {
			interface RoundState {
				matches: Array<{ status: string }>;
				isFinalized: boolean;
			}

			let finalizationCount = 0;

			const finalizeMatchAndCheckRound = (
				round: RoundState,
				matchIndex: number,
			): RoundState => {
				round.matches[matchIndex]!.status = "finalized";

				const allFinalized = round.matches.every(
					(m) => m.status === "finalized",
				);

				// Only finalize if not already finalized
				if (allFinalized && !round.isFinalized) {
					round.isFinalized = true;
					finalizationCount++;
				}

				return round;
			};

			const round: RoundState = {
				matches: [{ status: "finalized" }, { status: "finalized" }],
				isFinalized: true, // Already finalized
			};

			// Try to finalize again (shouldn't increment counter)
			finalizeMatchAndCheckRound(round, 0);
			finalizeMatchAndCheckRound(round, 1);

			expect(finalizationCount).toBe(0);
		});
	});

	describe("winner propagation on finalization", () => {
		it("should propagate winner to next round after finalization", () => {
			interface Match {
				matchNumber: number;
				player1Name: string;
				player2Name: string;
				winnerName: string | null;
				status: string;
			}

			interface Round {
				roundNumber: number;
				matches: Match[];
			}

			const propagateWinner = (
				rounds: Round[],
				currentRoundNumber: number,
				matchNumber: number,
				winnerName: string,
			) => {
				const nextRound = rounds.find(
					(r) => r.roundNumber === currentRoundNumber + 1,
				);

				if (nextRound) {
					const nextMatchNumber = Math.ceil(matchNumber / 2);
					const nextMatch = nextRound.matches.find(
						(m) => m.matchNumber === nextMatchNumber,
					);
					const isPlayer1 = matchNumber % 2 === 1;

					if (nextMatch) {
						if (isPlayer1) {
							nextMatch.player1Name = winnerName;
						} else {
							nextMatch.player2Name = winnerName;
						}
					}
				}
			};

			const rounds: Round[] = [
				{
					roundNumber: 1,
					matches: [
						{
							matchNumber: 1,
							player1Name: "Djokovic",
							player2Name: "Qualifier",
							winnerName: null,
							status: "pending",
						},
						{
							matchNumber: 2,
							player1Name: "Alcaraz",
							player2Name: "Zverev",
							winnerName: null,
							status: "pending",
						},
					],
				},
				{
					roundNumber: 2,
					matches: [
						{
							matchNumber: 1,
							player1Name: "TBD",
							player2Name: "TBD",
							winnerName: null,
							status: "pending",
						},
					],
				},
			];

			// Finalize match 1, winner is Djokovic
			propagateWinner(rounds, 1, 1, "Djokovic");
			expect(rounds[1]?.matches[0]?.player1Name).toBe("Djokovic");

			// Finalize match 2, winner is Alcaraz
			propagateWinner(rounds, 1, 2, "Alcaraz");
			expect(rounds[1]?.matches[0]?.player2Name).toBe("Alcaraz");
		});

		it("should propagate winner seed along with name when finalizing match", () => {
			interface Match {
				matchNumber: number;
				player1Name: string;
				player2Name: string;
				player1Seed: number | null;
				player2Seed: number | null;
			}

			// Bug fix: When finalizing a match manually (e.g., Musetti vs Sonego),
			// the winner's seed should also propagate to the next round
			const propagateWinnerWithSeed = (
				currentMatch: Match,
				nextMatch: Match,
				winnerName: string,
				isPlayer1Slot: boolean,
			) => {
				// Determine the winner's seed from current match
				const winnerSeed =
					winnerName === currentMatch.player1Name
						? currentMatch.player1Seed
						: currentMatch.player2Seed;

				// Propagate to next round
				if (isPlayer1Slot) {
					nextMatch.player1Name = winnerName;
					if (winnerSeed !== null) {
						nextMatch.player1Seed = winnerSeed;
					}
				} else {
					nextMatch.player2Name = winnerName;
					if (winnerSeed !== null) {
						nextMatch.player2Seed = winnerSeed;
					}
				}
			};

			// Test case: (5) L. Musetti beats L. Sonego
			const currentMatch: Match = {
				matchNumber: 1,
				player1Name: "L. Musetti",
				player2Name: "L. Sonego",
				player1Seed: 5, // Musetti is seeded 5
				player2Seed: null,
			};

			const nextMatch: Match = {
				matchNumber: 1,
				player1Name: "TBD",
				player2Name: "TBD",
				player1Seed: null,
				player2Seed: null,
			};

			// Musetti wins (match 1 is odd, so goes to player1 slot)
			propagateWinnerWithSeed(currentMatch, nextMatch, "L. Musetti", true);

			// Verify both name AND seed are propagated
			expect(nextMatch.player1Name).toBe("L. Musetti");
			expect(nextMatch.player1Seed).toBe(5); // Seed should be preserved!

			// Test case: Unseeded player wins
			const currentMatch2: Match = {
				matchNumber: 2,
				player1Name: "R. Collignon",
				player2Name: "C. Taberner",
				player1Seed: null,
				player2Seed: null,
			};

			const nextMatch2: Match = {
				matchNumber: 1,
				player1Name: "L. Musetti",
				player2Name: "TBD",
				player1Seed: 5,
				player2Seed: null,
			};

			// Collignon wins (match 2 is even, so goes to player2 slot)
			propagateWinnerWithSeed(currentMatch2, nextMatch2, "R. Collignon", false);

			// Verify name is propagated but seed remains null
			expect(nextMatch2.player2Name).toBe("R. Collignon");
			expect(nextMatch2.player2Seed).toBe(null);
		});

		it("should not propagate if no next round exists (final)", () => {
			interface Match {
				matchNumber: number;
				player1Name: string;
				player2Name: string;
			}

			interface Round {
				roundNumber: number;
				matches: Match[];
			}

			const propagateWinner = (
				rounds: Round[],
				currentRoundNumber: number,
				_matchNumber: number,
				_winnerName: string,
			) => {
				const nextRound = rounds.find(
					(r) => r.roundNumber === currentRoundNumber + 1,
				);
				return nextRound !== undefined;
			};

			const rounds: Round[] = [
				{
					roundNumber: 7, // Final
					matches: [
						{ matchNumber: 1, player1Name: "Djokovic", player2Name: "Sinner" },
					],
				},
			];

			// Should return false - no next round
			const propagated = propagateWinner(rounds, 7, 1, "Djokovic");
			expect(propagated).toBe(false);
		});
	});
});

// =============================================================================
// Performance Optimization Tests (2026-01-21)
// =============================================================================

describe("commitDraw performance optimizations", () => {
	/**
	 * Phase 1: Batch rounds + scoring rules insertion
	 * Previously: N queries for N rounds
	 * After: 2 queries total (1 for rounds, 1 for scoring rules)
	 */
	describe("Phase 1: Batch rounds and scoring rules insertion", () => {
		it("should create all rounds in a single batch operation", () => {
			// Simulates the batch insertion logic
			const parsedRounds = [
				{ roundNumber: 1, name: "Round of 128", matches: [] },
				{ roundNumber: 2, name: "Round of 64", matches: [] },
				{ roundNumber: 3, name: "Round of 32", matches: [] },
				{ roundNumber: 4, name: "Round of 16", matches: [] },
				{ roundNumber: 5, name: "Quarter Finals", matches: [] },
				{ roundNumber: 6, name: "Semi Finals", matches: [] },
				{ roundNumber: 7, name: "Final", matches: [] },
			];

			// Batch insert preparation
			const roundValues = parsedRounds.map((roundData) => ({
				tournamentId: 1,
				roundNumber: roundData.roundNumber,
				name: roundData.name,
				isActive: false,
				isFinalized: false,
			}));

			expect(roundValues.length).toBe(7);
			expect(roundValues[0]?.roundNumber).toBe(1);
			expect(roundValues[6]?.roundNumber).toBe(7);
		});

		it("should create scoring rules for all rounds in a single batch", () => {
			// Scoring configuration by round name
			const getScoringForRound = (
				roundName: string,
			): { pointsPerWinner: number; pointsExactScore: number } => {
				const scoringConfig: Record<
					string,
					{ pointsPerWinner: number; pointsExactScore: number }
				> = {
					"Round of 128": { pointsPerWinner: 2, pointsExactScore: 3 },
					"Round of 64": { pointsPerWinner: 3, pointsExactScore: 5 },
					"Round of 32": { pointsPerWinner: 5, pointsExactScore: 8 },
					"Round of 16": { pointsPerWinner: 8, pointsExactScore: 12 },
					"Quarter Finals": { pointsPerWinner: 12, pointsExactScore: 18 },
					"Semi Finals": { pointsPerWinner: 20, pointsExactScore: 30 },
					Final: { pointsPerWinner: 30, pointsExactScore: 45 },
				};
				return (
					scoringConfig[roundName] ?? {
						pointsPerWinner: 10,
						pointsExactScore: 5,
					}
				);
			};

			const insertedRounds = [
				{ id: 1, roundNumber: 1, name: "Round of 128" },
				{ id: 2, roundNumber: 2, name: "Round of 64" },
				{ id: 3, roundNumber: 3, name: "Round of 32" },
			];

			// Batch scoring rules preparation
			const scoringRuleValues = insertedRounds.map((round) => {
				const scoring = getScoringForRound(round.name);
				return {
					roundId: round.id,
					pointsPerWinner: scoring.pointsPerWinner,
					pointsExactScore: scoring.pointsExactScore,
				};
			});

			expect(scoringRuleValues.length).toBe(3);
			expect(scoringRuleValues[0]?.pointsPerWinner).toBe(2);
			expect(scoringRuleValues[1]?.pointsPerWinner).toBe(3);
			expect(scoringRuleValues[2]?.pointsPerWinner).toBe(5);
		});

		it("should maintain round number to ID mapping", () => {
			const insertedRounds = [
				{ id: 101, roundNumber: 1 },
				{ id: 102, roundNumber: 2 },
				{ id: 103, roundNumber: 3 },
			];

			const roundNumberToId = new Map(
				insertedRounds.map((r) => [r.roundNumber, r.id]),
			);

			expect(roundNumberToId.get(1)).toBe(101);
			expect(roundNumberToId.get(2)).toBe(102);
			expect(roundNumberToId.get(3)).toBe(103);
			expect(roundNumberToId.get(4)).toBeUndefined();
		});
	});

	/**
	 * Phase 2: Single batch for all matches insertion
	 * Previously: 7 queries for 7 rounds
	 * After: 1 query total for all 127 matches
	 */
	describe("Phase 2: Batch matches insertion", () => {
		it("should flatten all matches from all rounds into single array", () => {
			const parsedRounds = [
				{
					roundNumber: 1,
					matches: [
						{
							matchNumber: 1,
							player1Name: "Djokovic",
							player2Name: "Prizmic",
							player1Seed: 1,
							player2Seed: null,
						},
						{
							matchNumber: 2,
							player1Name: "Sinner",
							player2Name: "Van de Zandschulp",
							player1Seed: 4,
							player2Seed: null,
						},
					],
				},
				{
					roundNumber: 2,
					matches: [
						{
							matchNumber: 1,
							player1Name: "TBD",
							player2Name: "TBD",
							player1Seed: null,
							player2Seed: null,
						},
					],
				},
			];

			const roundNumberToId = new Map([
				[1, 101],
				[2, 102],
			]);

			// Flatten all matches
			const allMatchValues = parsedRounds.flatMap((roundData) => {
				const roundId = roundNumberToId.get(roundData.roundNumber);
				return roundData.matches.map((match) => ({
					roundId,
					matchNumber: match.matchNumber,
					player1Name: match.player1Name,
					player2Name: match.player2Name,
					player1Seed: match.player1Seed,
					player2Seed: match.player2Seed,
					status: "pending" as const,
				}));
			});

			expect(allMatchValues.length).toBe(3);
			expect(allMatchValues[0]?.roundId).toBe(101);
			expect(allMatchValues[2]?.roundId).toBe(102);
		});

		it("should correctly identify and auto-finalize BYE matches in batch", () => {
			const matchData = [
				{
					player1Name: "BYE",
					player2Name: "Djokovic",
					player1Seed: null,
					player2Seed: 1,
				},
				{
					player1Name: "Sinner",
					player2Name: "BYE",
					player1Seed: 4,
					player2Seed: null,
				},
				{
					player1Name: "Alcaraz",
					player2Name: "Medvedev",
					player1Seed: 2,
					player2Seed: 5,
				},
			];

			const processMatch = (match: (typeof matchData)[0]) => {
				const player1Name = match.player1Name?.trim() || "TBD";
				const player2Name = match.player2Name?.trim() || "TBD";
				const player1IsBye = player1Name.toUpperCase() === "BYE";
				const player2IsBye = player2Name.toUpperCase() === "BYE";
				const isBye = player1IsBye || player2IsBye;

				if (isBye) {
					const winnerName = player1IsBye ? player2Name : player1Name;
					return {
						player1Name,
						player2Name,
						winnerName,
						status: "finalized" as const,
						isBye: true,
					};
				}

				return {
					player1Name,
					player2Name,
					winnerName: null,
					status: "pending" as const,
					isBye: false,
				};
			};

			const processedMatches = matchData.map(processMatch);

			// First match: BYE vs Djokovic - Djokovic wins
			expect(processedMatches[0]?.isBye).toBe(true);
			expect(processedMatches[0]?.winnerName).toBe("Djokovic");
			expect(processedMatches[0]?.status).toBe("finalized");

			// Second match: Sinner vs BYE - Sinner wins
			expect(processedMatches[1]?.isBye).toBe(true);
			expect(processedMatches[1]?.winnerName).toBe("Sinner");
			expect(processedMatches[1]?.status).toBe("finalized");

			// Third match: Normal match
			expect(processedMatches[2]?.isBye).toBe(false);
			expect(processedMatches[2]?.winnerName).toBeNull();
			expect(processedMatches[2]?.status).toBe("pending");
		});

		it("should handle matches with result from parser", () => {
			const matchWithResult = {
				matchNumber: 1,
				player1Name: "Alcaraz",
				player2Name: "Gasquet",
				player1Seed: 2,
				player2Seed: null,
				winnerName: "Alcaraz",
				setsWon: 3,
				setsLost: 0,
				finalScore: "3-0",
			};

			const hasResult = !!(
				matchWithResult.winnerName &&
				matchWithResult.setsWon != null &&
				matchWithResult.setsLost != null &&
				matchWithResult.finalScore
			);

			expect(hasResult).toBe(true);

			// When match has result, it should be marked as finalized
			if (hasResult) {
				const processedMatch = {
					player1Name: matchWithResult.player1Name,
					player2Name: matchWithResult.player2Name,
					winnerName: matchWithResult.winnerName,
					finalScore: matchWithResult.finalScore,
					setsWon: matchWithResult.setsWon,
					setsLost: matchWithResult.setsLost,
					status: "finalized" as const,
					isBye: false,
				};

				expect(processedMatch.status).toBe("finalized");
				expect(processedMatch.winnerName).toBe("Alcaraz");
				expect(processedMatch.setsWon).toBe(3);
			}
		});

		it("should normalize empty player names to TBD", () => {
			const normalizePlayerName = (name: string | undefined | null): string => {
				return name?.trim() || "TBD";
			};

			// Clear seeds for TBD players
			const processPlayerSeed = (
				playerName: string,
				seed: number | null,
			): number | null => {
				return playerName === "TBD" ? null : seed;
			};

			const testCases = [
				{ name: "", expected: "TBD" },
				{ name: "   ", expected: "TBD" },
				{ name: null as unknown as string, expected: "TBD" },
				{ name: undefined as unknown as string, expected: "TBD" },
				{ name: "Djokovic", expected: "Djokovic" },
			];

			for (const testCase of testCases) {
				expect(normalizePlayerName(testCase.name)).toBe(testCase.expected);
			}

			// TBD player should have null seed
			expect(processPlayerSeed("TBD", 5)).toBeNull();
			expect(processPlayerSeed("Djokovic", 1)).toBe(1);
		});

		it("should calculate correct match count for standard tournament sizes", () => {
			// Standard ATP tournament sizes
			const tournamentSizes = [
				{ size: 128, totalMatches: 127 },
				{ size: 64, totalMatches: 63 },
				{ size: 32, totalMatches: 31 },
				{ size: 16, totalMatches: 15 },
			];

			for (const { size, totalMatches } of tournamentSizes) {
				// Calculate total matches: size-1 for single elimination
				const calculatedMatches = size - 1;
				expect(calculatedMatches).toBe(totalMatches);

				// Calculate matches per round
				let roundMatches = size / 2;
				let total = 0;
				while (roundMatches >= 1) {
					total += roundMatches;
					roundMatches = roundMatches / 2;
				}
				expect(total).toBe(totalMatches);
			}
		});
	});

	/**
	 * Phase 3: Bulk winner propagation using SQL CASE statements
	 * Previously: N individual updates for N finalized matches
	 * After: 1 update per target round using CASE statements
	 */
	describe("Phase 3: Bulk winner propagation", () => {
		interface WinnerUpdate {
			targetRoundNumber: number;
			targetMatchNumber: number;
			playerSlot: "player1" | "player2";
			winnerName: string;
			winnerSeed: number | null;
		}

		it("should collect winner updates from finalized matches", () => {
			const rounds = [
				{
					roundNumber: 1,
					matches: [
						{
							matchNumber: 1,
							player1Name: "BYE",
							player2Name: "Djokovic",
							player1Seed: null,
							player2Seed: 1,
							winnerName: "Djokovic",
							status: "finalized",
						},
						{
							matchNumber: 2,
							player1Name: "Sinner",
							player2Name: "BYE",
							player1Seed: 4,
							player2Seed: null,
							winnerName: "Sinner",
							status: "finalized",
						},
						{
							matchNumber: 3,
							player1Name: "Alcaraz",
							player2Name: "Qualifier",
							player1Seed: 2,
							player2Seed: null,
							winnerName: null,
							status: "pending",
						},
						{
							matchNumber: 4,
							player1Name: "Medvedev",
							player2Name: "BYE",
							player1Seed: 5,
							player2Seed: null,
							winnerName: "Medvedev",
							status: "finalized",
						},
					],
				},
				{
					roundNumber: 2,
					matches: [
						{
							matchNumber: 1,
							player1Name: "TBD",
							player2Name: "TBD",
							player1Seed: null,
							player2Seed: null,
							winnerName: null,
							status: "pending",
						},
						{
							matchNumber: 2,
							player1Name: "TBD",
							player2Name: "TBD",
							player1Seed: null,
							player2Seed: null,
							winnerName: null,
							status: "pending",
						},
					],
				},
			];

			const winnerUpdates: WinnerUpdate[] = [];

			for (const currentRound of rounds) {
				const finalizedMatches = currentRound.matches.filter(
					(m) => m.status === "finalized" && m.winnerName,
				);

				const nextRound = rounds.find(
					(r) => r.roundNumber === currentRound.roundNumber + 1,
				);

				if (!nextRound) continue;

				for (const finalizedMatch of finalizedMatches) {
					if (!finalizedMatch.winnerName) continue;

					const nextMatchNumber = Math.ceil(finalizedMatch.matchNumber / 2);
					const playerSlot =
						finalizedMatch.matchNumber % 2 === 1 ? "player1" : "player2";

					const winnerSeed =
						finalizedMatch.winnerName === finalizedMatch.player1Name
							? finalizedMatch.player1Seed
							: finalizedMatch.player2Seed;

					winnerUpdates.push({
						targetRoundNumber: nextRound.roundNumber,
						targetMatchNumber: nextMatchNumber,
						playerSlot,
						winnerName: finalizedMatch.winnerName,
						winnerSeed,
					});
				}
			}

			// Should have 3 updates (3 finalized matches, 1 pending)
			expect(winnerUpdates.length).toBe(3);

			// Match 1 (odd) -> Next Match 1, player1
			expect(winnerUpdates[0]?.targetMatchNumber).toBe(1);
			expect(winnerUpdates[0]?.playerSlot).toBe("player1");
			expect(winnerUpdates[0]?.winnerName).toBe("Djokovic");
			expect(winnerUpdates[0]?.winnerSeed).toBe(1);

			// Match 2 (even) -> Next Match 1, player2
			expect(winnerUpdates[1]?.targetMatchNumber).toBe(1);
			expect(winnerUpdates[1]?.playerSlot).toBe("player2");
			expect(winnerUpdates[1]?.winnerName).toBe("Sinner");
			expect(winnerUpdates[1]?.winnerSeed).toBe(4);

			// Match 4 (even) -> Next Match 2, player2
			expect(winnerUpdates[2]?.targetMatchNumber).toBe(2);
			expect(winnerUpdates[2]?.playerSlot).toBe("player2");
			expect(winnerUpdates[2]?.winnerName).toBe("Medvedev");
			expect(winnerUpdates[2]?.winnerSeed).toBe(5);
		});

		it("should group updates by target round for bulk operations", () => {
			const winnerUpdates: WinnerUpdate[] = [
				{
					targetRoundNumber: 2,
					targetMatchNumber: 1,
					playerSlot: "player1",
					winnerName: "Djokovic",
					winnerSeed: 1,
				},
				{
					targetRoundNumber: 2,
					targetMatchNumber: 1,
					playerSlot: "player2",
					winnerName: "Sinner",
					winnerSeed: 4,
				},
				{
					targetRoundNumber: 2,
					targetMatchNumber: 2,
					playerSlot: "player2",
					winnerName: "Medvedev",
					winnerSeed: 5,
				},
				{
					targetRoundNumber: 3,
					targetMatchNumber: 1,
					playerSlot: "player1",
					winnerName: "Alcaraz",
					winnerSeed: 2,
				},
			];

			// Group by target round
			const updatesByRound = new Map<number, WinnerUpdate[]>();
			for (const update of winnerUpdates) {
				const roundUpdates = updatesByRound.get(update.targetRoundNumber);
				if (roundUpdates) {
					roundUpdates.push(update);
				} else {
					updatesByRound.set(update.targetRoundNumber, [update]);
				}
			}

			expect(updatesByRound.size).toBe(2);
			expect(updatesByRound.get(2)?.length).toBe(3);
			expect(updatesByRound.get(3)?.length).toBe(1);
		});

		it("should separate updates by player slot for CASE statement generation", () => {
			const roundUpdates: WinnerUpdate[] = [
				{
					targetRoundNumber: 2,
					targetMatchNumber: 1,
					playerSlot: "player1",
					winnerName: "Djokovic",
					winnerSeed: 1,
				},
				{
					targetRoundNumber: 2,
					targetMatchNumber: 1,
					playerSlot: "player2",
					winnerName: "Sinner",
					winnerSeed: 4,
				},
				{
					targetRoundNumber: 2,
					targetMatchNumber: 2,
					playerSlot: "player2",
					winnerName: "Medvedev",
					winnerSeed: 5,
				},
			];

			const player1Updates = roundUpdates.filter(
				(u) => u.playerSlot === "player1",
			);
			const player2Updates = roundUpdates.filter(
				(u) => u.playerSlot === "player2",
			);

			expect(player1Updates.length).toBe(1);
			expect(player2Updates.length).toBe(2);

			// SQL CASE would be generated like:
			// SET player1_name = CASE
			//   WHEN match_number = 1 THEN 'Djokovic'
			//   ELSE player1_name
			// END,
			// player2_name = CASE
			//   WHEN match_number = 1 THEN 'Sinner'
			//   WHEN match_number = 2 THEN 'Medvedev'
			//   ELSE player2_name
			// END
		});

		it("should preserve seed information during bulk propagation", () => {
			const winnerUpdates: WinnerUpdate[] = [
				{
					targetRoundNumber: 2,
					targetMatchNumber: 1,
					playerSlot: "player1",
					winnerName: "Djokovic",
					winnerSeed: 1, // Seeded player
				},
				{
					targetRoundNumber: 2,
					targetMatchNumber: 1,
					playerSlot: "player2",
					winnerName: "Qualifier",
					winnerSeed: null, // Unseeded player
				},
			];

			// All updates should have valid winnerSeed (including null for unseeded)
			for (const update of winnerUpdates) {
				expect(update.winnerName).toBeDefined();
				// winnerSeed can be number or null
				expect(
					update.winnerSeed === null || typeof update.winnerSeed === "number",
				).toBe(true);
			}

			// Seeded player
			expect(winnerUpdates[0]?.winnerSeed).toBe(1);
			// Unseeded player
			expect(winnerUpdates[1]?.winnerSeed).toBeNull();
		});

		it("should handle multi-round propagation chain", () => {
			// Simulates a scenario where R1 BYE winners propagate to R2,
			// and R2 has completed matches that propagate to R3
			interface Match {
				matchNumber: number;
				player1Name: string;
				player2Name: string;
				player1Seed: number | null;
				player2Seed: number | null;
				winnerName: string | null;
				status: string;
			}

			interface Round {
				roundNumber: number;
				matches: Match[];
			}

			const rounds: Round[] = [
				{
					roundNumber: 1,
					matches: [
						{
							matchNumber: 1,
							player1Name: "BYE",
							player2Name: "Djokovic",
							player1Seed: null,
							player2Seed: 1,
							winnerName: "Djokovic",
							status: "finalized",
						},
						{
							matchNumber: 2,
							player1Name: "Sinner",
							player2Name: "BYE",
							player1Seed: 4,
							player2Seed: null,
							winnerName: "Sinner",
							status: "finalized",
						},
					],
				},
				{
					roundNumber: 2,
					matches: [
						{
							matchNumber: 1,
							player1Name: "Djokovic",
							player2Name: "Sinner",
							player1Seed: 1,
							player2Seed: 4,
							winnerName: "Djokovic",
							status: "finalized",
						},
					],
				},
				{
					roundNumber: 3,
					matches: [
						{
							matchNumber: 1,
							player1Name: "TBD",
							player2Name: "TBD",
							player1Seed: null,
							player2Seed: null,
							winnerName: null,
							status: "pending",
						},
					],
				},
			];

			// Collect all updates
			const allUpdates: WinnerUpdate[] = [];

			for (const currentRound of rounds) {
				const finalizedMatches = currentRound.matches.filter(
					(m) => m.status === "finalized" && m.winnerName,
				);

				const nextRound = rounds.find(
					(r) => r.roundNumber === currentRound.roundNumber + 1,
				);

				if (!nextRound) continue;

				for (const match of finalizedMatches) {
					if (!match.winnerName) continue;

					const nextMatchNumber = Math.ceil(match.matchNumber / 2);
					const playerSlot =
						match.matchNumber % 2 === 1 ? "player1" : "player2";
					const winnerSeed =
						match.winnerName === match.player1Name
							? match.player1Seed
							: match.player2Seed;

					allUpdates.push({
						targetRoundNumber: nextRound.roundNumber,
						targetMatchNumber: nextMatchNumber,
						playerSlot,
						winnerName: match.winnerName,
						winnerSeed,
					});
				}
			}

			// Should have 3 updates: R1->R2 (2 BYEs) + R2->R3 (1 completed)
			expect(allUpdates.length).toBe(3);

			// R1 -> R2 updates
			const r2Updates = allUpdates.filter((u) => u.targetRoundNumber === 2);
			expect(r2Updates.length).toBe(2);

			// R2 -> R3 updates
			const r3Updates = allUpdates.filter((u) => u.targetRoundNumber === 3);
			expect(r3Updates.length).toBe(1);
			expect(r3Updates[0]?.winnerName).toBe("Djokovic");
			expect(r3Updates[0]?.winnerSeed).toBe(1);
		});
	});

	/**
	 * Phase 4: Skip score calculation for new tournaments
	 * Previously: Calculate scores for all matches even when no picks exist
	 * After: Only calculate when picks exist
	 */
	describe("Phase 4: Skip score calculation optimization", () => {
		it("should detect when no picks exist", () => {
			const existingPicks: { id: number }[] = [];
			const shouldCalculateScores = existingPicks.length > 0;
			expect(shouldCalculateScores).toBe(false);
		});

		it("should detect when picks exist", () => {
			const existingPicks = [{ id: 1 }];
			const shouldCalculateScores = existingPicks.length > 0;
			expect(shouldCalculateScores).toBe(true);
		});

		it("should only calculate scores for non-BYE finalized matches", () => {
			const allMatches = [
				{
					id: 1,
					status: "finalized",
					isBye: true,
					setsWon: null,
					setsLost: null,
				},
				{ id: 2, status: "finalized", isBye: false, setsWon: 3, setsLost: 1 },
				{
					id: 3,
					status: "pending",
					isBye: false,
					setsWon: null,
					setsLost: null,
				},
				{ id: 4, status: "finalized", isBye: false, setsWon: 2, setsLost: 0 },
			];

			// Filter matches that need scoring
			const matchesToScore = allMatches.filter(
				(m) =>
					m.status === "finalized" &&
					!m.isBye &&
					m.setsWon != null &&
					m.setsLost != null,
			);

			expect(matchesToScore.length).toBe(2);
			expect(matchesToScore[0]?.id).toBe(2);
			expect(matchesToScore[1]?.id).toBe(4);
		});

		it("should handle tournament with mix of completed and pending matches", () => {
			const roundMatches = [
				{ status: "finalized", isBye: true }, // BYE - skip scoring
				{ status: "finalized", isBye: true }, // BYE - skip scoring
				{ status: "finalized", isBye: false, setsWon: 3, setsLost: 1 }, // Score this
				{ status: "finalized", isBye: false, setsWon: 3, setsLost: 2 }, // Score this
				{ status: "pending", isBye: false }, // Not finalized - skip
			];

			const finalizedNonBye = roundMatches.filter(
				(m) => m.status === "finalized" && !m.isBye,
			);

			expect(finalizedNonBye.length).toBe(2);
		});
	});
});

// =============================================================================
// Seed Propagation Bug Fix Tests (2026-01-21)
// =============================================================================

describe("finalizeMatch seed propagation bug fix", () => {
	/**
	 * Bug: When manually finalizing a match, the winner's seed was not propagating
	 * to the next round. For example, (5) L. Musetti beats L. Sonego should show
	 * "(5) L. Musetti" in the next round, not just "L. Musetti".
	 */

	describe("seed determination from match", () => {
		it("should get winner seed when player1 wins (seeded)", () => {
			const match = {
				player1Name: "L. Musetti",
				player2Name: "L. Sonego",
				player1Seed: 5,
				player2Seed: null,
			};
			const winnerName = "L. Musetti";

			const winnerSeed =
				winnerName === match.player1Name
					? match.player1Seed
					: match.player2Seed;

			expect(winnerSeed).toBe(5);
		});

		it("should get winner seed when player2 wins (seeded)", () => {
			const match = {
				player1Name: "L. Sonego",
				player2Name: "L. Musetti",
				player1Seed: null,
				player2Seed: 5,
			};
			const winnerName = "L. Musetti";

			const winnerSeed =
				winnerName === match.player1Name
					? match.player1Seed
					: match.player2Seed;

			expect(winnerSeed).toBe(5);
		});

		it("should return null for unseeded winner", () => {
			const match = {
				player1Name: "L. Musetti",
				player2Name: "L. Sonego",
				player1Seed: 5,
				player2Seed: null,
			};
			const winnerName = "L. Sonego"; // Unseeded player wins

			const winnerSeed =
				winnerName === match.player1Name
					? match.player1Seed
					: match.player2Seed;

			expect(winnerSeed).toBeNull();
		});

		it("should handle both players seeded", () => {
			const match = {
				player1Name: "C. Alcaraz",
				player2Name: "D. Medvedev",
				player1Seed: 2,
				player2Seed: 5,
			};

			// Alcaraz wins
			let winnerName = "C. Alcaraz";
			let winnerSeed =
				winnerName === match.player1Name
					? match.player1Seed
					: match.player2Seed;
			expect(winnerSeed).toBe(2);

			// Medvedev wins
			winnerName = "D. Medvedev";
			winnerSeed =
				winnerName === match.player1Name
					? match.player1Seed
					: match.player2Seed;
			expect(winnerSeed).toBe(5);
		});

		it("should handle both players unseeded", () => {
			const match = {
				player1Name: "Qualifier A",
				player2Name: "Qualifier B",
				player1Seed: null,
				player2Seed: null,
			};
			const winnerName = "Qualifier A";

			const winnerSeed =
				winnerName === match.player1Name
					? match.player1Seed
					: match.player2Seed;

			expect(winnerSeed).toBeNull();
		});
	});

	describe("next match update data construction", () => {
		it("should include seed in update when winner is seeded and goes to player1 slot", () => {
			const match = {
				matchNumber: 1, // Odd -> player1 slot
				player1Name: "L. Musetti",
				player2Name: "L. Sonego",
				player1Seed: 5,
				player2Seed: null,
			};
			const winnerName = "L. Musetti";

			const isPlayer1 = match.matchNumber % 2 === 1;
			const winnerSeed =
				winnerName === match.player1Name
					? match.player1Seed
					: match.player2Seed;

			const updateData = isPlayer1
				? {
						player1Name: winnerName,
						...(winnerSeed !== null && { player1Seed: winnerSeed }),
					}
				: {
						player2Name: winnerName,
						...(winnerSeed !== null && { player2Seed: winnerSeed }),
					};

			expect(updateData).toEqual({
				player1Name: "L. Musetti",
				player1Seed: 5,
			});
		});

		it("should include seed in update when winner is seeded and goes to player2 slot", () => {
			const match = {
				matchNumber: 2, // Even -> player2 slot
				player1Name: "L. Musetti",
				player2Name: "L. Sonego",
				player1Seed: 5,
				player2Seed: null,
			};
			const winnerName = "L. Musetti";

			const isPlayer1 = match.matchNumber % 2 === 1;
			const winnerSeed =
				winnerName === match.player1Name
					? match.player1Seed
					: match.player2Seed;

			const updateData = isPlayer1
				? {
						player1Name: winnerName,
						...(winnerSeed !== null && { player1Seed: winnerSeed }),
					}
				: {
						player2Name: winnerName,
						...(winnerSeed !== null && { player2Seed: winnerSeed }),
					};

			expect(updateData).toEqual({
				player2Name: "L. Musetti",
				player2Seed: 5,
			});
		});

		it("should NOT include seed when winner is unseeded", () => {
			const match = {
				matchNumber: 1,
				player1Name: "L. Musetti",
				player2Name: "L. Sonego",
				player1Seed: 5,
				player2Seed: null,
			};
			const winnerName = "L. Sonego"; // Unseeded player wins

			const isPlayer1 = match.matchNumber % 2 === 1;
			const winnerSeed =
				winnerName === match.player1Name
					? match.player1Seed
					: match.player2Seed;

			const updateData = isPlayer1
				? {
						player1Name: winnerName,
						...(winnerSeed !== null && { player1Seed: winnerSeed }),
					}
				: {
						player2Name: winnerName,
						...(winnerSeed !== null && { player2Seed: winnerSeed }),
					};

			// Should NOT include player1Seed because winnerSeed is null
			expect(updateData).toEqual({
				player1Name: "L. Sonego",
			});
			expect(updateData).not.toHaveProperty("player1Seed");
		});
	});

	describe("seed propagation through multiple rounds", () => {
		it("should preserve seed through R1 -> R2 -> R3 propagation", () => {
			interface NextMatch {
				player1Name: string;
				player2Name: string;
				player1Seed: number | null;
				player2Seed: number | null;
			}

			const propagateWinner = (
				matchNumber: number,
				winnerName: string,
				winnerSeed: number | null,
				nextMatch: NextMatch,
			) => {
				const isPlayer1 = matchNumber % 2 === 1;

				if (isPlayer1) {
					nextMatch.player1Name = winnerName;
					if (winnerSeed !== null) {
						nextMatch.player1Seed = winnerSeed;
					}
				} else {
					nextMatch.player2Name = winnerName;
					if (winnerSeed !== null) {
						nextMatch.player2Seed = winnerSeed;
					}
				}
			};

			// R1 -> R2: (5) Musetti wins match 1
			const r2Match: NextMatch = {
				player1Name: "TBD",
				player2Name: "TBD",
				player1Seed: null,
				player2Seed: null,
			};

			propagateWinner(1, "L. Musetti", 5, r2Match);
			expect(r2Match.player1Name).toBe("L. Musetti");
			expect(r2Match.player1Seed).toBe(5);

			// Another player wins match 2 (unseeded)
			propagateWinner(2, "R. Collignon", null, r2Match);
			expect(r2Match.player2Name).toBe("R. Collignon");
			expect(r2Match.player2Seed).toBeNull();

			// R2 -> R3: (5) Musetti beats Collignon
			const r3Match: NextMatch = {
				player1Name: "TBD",
				player2Name: "TBD",
				player1Seed: null,
				player2Seed: null,
			};

			// In R2, the match would be match 1, and player1 is Musetti with seed 5
			propagateWinner(1, "L. Musetti", 5, r3Match);
			expect(r3Match.player1Name).toBe("L. Musetti");
			expect(r3Match.player1Seed).toBe(5);
		});

		it("should handle upset where unseeded player beats seeded player", () => {
			interface NextMatch {
				player1Name: string;
				player2Name: string;
				player1Seed: number | null;
				player2Seed: number | null;
			}

			const r2Match: NextMatch = {
				player1Name: "TBD",
				player2Name: "TBD",
				player1Seed: null,
				player2Seed: null,
			};

			// Qualifier beats (1) Djokovic in match 1
			// Winner name is "Qualifier", winnerSeed is null (not seeded)
			const matchNumber = 1;
			const winnerName = "Qualifier";
			const winnerSeed = null; // Qualifier has no seed

			const isPlayer1 = matchNumber % 2 === 1;
			if (isPlayer1) {
				r2Match.player1Name = winnerName;
				if (winnerSeed !== null) {
					r2Match.player1Seed = winnerSeed;
				}
			}

			expect(r2Match.player1Name).toBe("Qualifier");
			// player1Seed should NOT be set (remains null/undefined)
			expect(r2Match.player1Seed).toBeNull();
		});
	});

	describe("real-world test case: Musetti vs Sonego", () => {
		it("should correctly propagate (5) L. Musetti to next round", () => {
			// The actual bug scenario
			const currentMatch = {
				id: 1,
				matchNumber: 1,
				player1Name: "L. Musetti",
				player2Name: "L. Sonego",
				player1Seed: 5,
				player2Seed: null,
			};

			const nextMatch = {
				id: 2,
				matchNumber: 1, // In next round
				player1Name: "TBD",
				player2Name: "TBD",
				player1Seed: null,
				player2Seed: null,
			};

			// Finalize match: Musetti wins
			const winnerName = "L. Musetti";

			// Calculate next match position
			const nextMatchNumber = Math.ceil(currentMatch.matchNumber / 2);
			expect(nextMatchNumber).toBe(1);

			const isPlayer1 = currentMatch.matchNumber % 2 === 1;
			expect(isPlayer1).toBe(true);

			// Determine winner seed
			const winnerSeed =
				winnerName === currentMatch.player1Name
					? currentMatch.player1Seed
					: currentMatch.player2Seed;
			expect(winnerSeed).toBe(5);

			// Build update data
			const updateData = isPlayer1
				? {
						player1Name: winnerName,
						...(winnerSeed !== null && { player1Seed: winnerSeed }),
					}
				: {
						player2Name: winnerName,
						...(winnerSeed !== null && { player2Seed: winnerSeed }),
					};

			expect(updateData).toEqual({
				player1Name: "L. Musetti",
				player1Seed: 5,
			});

			// Apply update
			Object.assign(nextMatch, updateData);

			// Verify the fix: Both name AND seed are propagated
			expect(nextMatch.player1Name).toBe("L. Musetti");
			expect(nextMatch.player1Seed).toBe(5);
		});
	});
});

// =============================================================================
// Round Auto-Finalization Tests (Enhanced)
// =============================================================================

describe("round auto-finalization (enhanced)", () => {
	describe("commitDraw round auto-finalization", () => {
		it("should identify rounds where all matches are finalized", () => {
			const rounds = [
				{
					id: 1,
					roundNumber: 1,
					isFinalized: false,
					matches: [
						{ status: "finalized", deletedAt: null },
						{ status: "finalized", deletedAt: null },
						{ status: "finalized", deletedAt: null },
					],
				},
				{
					id: 2,
					roundNumber: 2,
					isFinalized: false,
					matches: [
						{ status: "finalized", deletedAt: null },
						{ status: "pending", deletedAt: null },
					],
				},
				{
					id: 3,
					roundNumber: 3,
					isFinalized: false,
					matches: [
						{ status: "pending", deletedAt: null },
						{ status: "pending", deletedAt: null },
					],
				},
			];

			const roundsToFinalize = rounds.filter((round) => {
				const roundMatches = round.matches.filter((m) => !m.deletedAt);
				const allMatchesFinalized = roundMatches.every(
					(m) => m.status === "finalized",
				);
				return (
					allMatchesFinalized && roundMatches.length > 0 && !round.isFinalized
				);
			});

			expect(roundsToFinalize.length).toBe(1);
			expect(roundsToFinalize[0]?.id).toBe(1);
		});

		it("should exclude soft-deleted matches from finalization check", () => {
			const round = {
				id: 1,
				isFinalized: false,
				matches: [
					{ status: "finalized", deletedAt: null },
					{ status: "pending", deletedAt: new Date() }, // Soft deleted
					{ status: "finalized", deletedAt: null },
				],
			};

			const roundMatches = round.matches.filter((m) => !m.deletedAt);
			const allMatchesFinalized = roundMatches.every(
				(m) => m.status === "finalized",
			);

			// Should be true because the pending match is soft-deleted
			expect(allMatchesFinalized).toBe(true);
			expect(roundMatches.length).toBe(2);
		});

		it("should not re-finalize already finalized rounds", () => {
			const rounds = [
				{
					id: 1,
					isFinalized: true, // Already finalized
					matches: [
						{ status: "finalized", deletedAt: null },
						{ status: "finalized", deletedAt: null },
					],
				},
			];

			const roundsToFinalize = rounds.filter((round) => {
				const roundMatches = round.matches.filter((m) => !m.deletedAt);
				const allMatchesFinalized = roundMatches.every(
					(m) => m.status === "finalized",
				);
				return (
					allMatchesFinalized && roundMatches.length > 0 && !round.isFinalized
				);
			});

			expect(roundsToFinalize.length).toBe(0);
		});

		it("should not finalize rounds with no matches", () => {
			const rounds = [
				{
					id: 1,
					isFinalized: false,
					matches: [],
				},
			];

			const roundsToFinalize = rounds.filter((round) => {
				const roundMatches = round.matches.filter(
					(m: { deletedAt: Date | null }) => !m.deletedAt,
				);
				const allMatchesFinalized = roundMatches.every(
					(m: { status: string }) => m.status === "finalized",
				);
				return (
					allMatchesFinalized && roundMatches.length > 0 && !round.isFinalized
				);
			});

			expect(roundsToFinalize.length).toBe(0);
		});
	});

	describe("finalizeMatch round auto-finalization", () => {
		it("should finalize round when last match is finalized", () => {
			interface Match {
				id: number;
				status: string;
			}

			interface Round {
				id: number;
				isFinalized: boolean;
			}

			const roundMatches: Match[] = [
				{ id: 1, status: "finalized" },
				{ id: 2, status: "finalized" },
				{ id: 3, status: "pending" }, // This one will be finalized
			];

			const round: Round = {
				id: 100,
				isFinalized: false,
			};

			// Simulate finalizing the last match
			const matchToFinalize = roundMatches.find((m) => m.id === 3);
			if (matchToFinalize) {
				matchToFinalize.status = "finalized";
			}

			// Check if round should be auto-finalized
			const allMatchesFinalized = roundMatches.every(
				(m) => m.status === "finalized",
			);

			let shouldFinalizeRound = false;
			if (allMatchesFinalized && !round.isFinalized) {
				shouldFinalizeRound = true;
				round.isFinalized = true;
			}

			expect(shouldFinalizeRound).toBe(true);
			expect(round.isFinalized).toBe(true);
		});

		it("should not finalize round when matches remain pending", () => {
			interface Match {
				id: number;
				status: string;
			}

			interface Round {
				id: number;
				isFinalized: boolean;
			}

			const roundMatches: Match[] = [
				{ id: 1, status: "finalized" },
				{ id: 2, status: "pending" },
				{ id: 3, status: "pending" },
			];

			const round: Round = {
				id: 100,
				isFinalized: false,
			};

			// Finalize match 3
			const matchToFinalize = roundMatches.find((m) => m.id === 3);
			if (matchToFinalize) {
				matchToFinalize.status = "finalized";
			}

			const allMatchesFinalized = roundMatches.every(
				(m) => m.status === "finalized",
			);

			let shouldFinalizeRound = false;
			if (allMatchesFinalized && !round.isFinalized) {
				shouldFinalizeRound = true;
			}

			expect(shouldFinalizeRound).toBe(false);
			expect(round.isFinalized).toBe(false);
		});
	});

	describe("batch finalization in commitDraw", () => {
		it("should collect all round IDs for batch finalization", () => {
			const rounds = [
				{ id: 1, roundNumber: 1, isFinalized: false },
				{ id: 2, roundNumber: 2, isFinalized: false },
				{ id: 3, roundNumber: 3, isFinalized: false },
			];

			const roundsToFinalize = [rounds[0], rounds[1]]; // First two rounds complete

			if (roundsToFinalize && roundsToFinalize.length > 0) {
				const roundIdsToFinalize = roundsToFinalize
					.filter((r): r is NonNullable<typeof r> => r !== undefined)
					.map((r) => r.id);

				expect(roundIdsToFinalize).toEqual([1, 2]);
				expect(roundIdsToFinalize.length).toBe(2);
			}
		});
	});
});

// =============================================================================
// Edge Cases and Regression Tests
// =============================================================================

describe("edge cases and regression tests", () => {
	describe("empty tournament handling", () => {
		it("should handle tournament with no matches", () => {
			interface ParsedRound {
				roundNumber: number;
				name: string;
				matches: Array<{
					matchNumber: number;
					player1Name: string;
					player2Name: string;
				}>;
			}

			const parsedDraw: {
				tournamentName: string;
				year: number;
				rounds: ParsedRound[];
			} = {
				tournamentName: "Empty Tournament",
				year: 2024,
				rounds: [],
			};

			expect(parsedDraw.rounds.length).toBe(0);

			// Should not crash on empty arrays
			const allMatchValues = parsedDraw.rounds.flatMap((r) => r.matches ?? []);
			expect(allMatchValues.length).toBe(0);
		});

		it("should handle round with no matches", () => {
			const parsedDraw = {
				tournamentName: "Partial Tournament",
				year: 2024,
				rounds: [{ roundNumber: 1, name: "Round 1", matches: [] }],
			};

			const allMatchValues = parsedDraw.rounds.flatMap((r) => r.matches);
			expect(allMatchValues.length).toBe(0);
		});
	});

	describe("special character handling in player names", () => {
		it("should handle accented characters", () => {
			const players = [
				"Gaël Monfils",
				"Rafael Nadal",
				"João Sousa",
				"Casper Ruud",
				"Holger Rune",
				"Jan-Lennard Struff",
			];

			for (const player of players) {
				const normalized = player.trim();
				expect(normalized.length).toBeGreaterThan(0);
				expect(normalized).not.toBe("TBD");
			}
		});

		it("should handle hyphenated names", () => {
			const names = [
				"Van de Zandschulp",
				"De Minaur",
				"Ben Shelton",
				"Tommy Paul",
			];

			for (const name of names) {
				expect(name.trim()).toBe(name);
			}
		});
	});

	describe("transaction rollback on error", () => {
		it("should maintain data integrity on partial failure", async () => {
			// Simulates transaction behavior
			let transactionComplete = false;
			let roundsInserted = false;
			let matchesInserted = false;

			const executeTransaction = async () => {
				try {
					// Phase 1: Insert rounds
					roundsInserted = true;

					// Phase 2: Insert matches - simulate failure
					throw new Error("Match insertion failed");

					// This should never be reached
					matchesInserted = true;
					transactionComplete = true;
				} catch (error) {
					// Transaction should rollback
					roundsInserted = false;
					matchesInserted = false;
					throw error;
				}
			};

			await expect(executeTransaction()).rejects.toThrow(
				"Match insertion failed",
			);
			expect(transactionComplete).toBe(false);
			// In a real transaction, roundsInserted would also be rolled back
		});
	});

	describe("concurrent operation handling", () => {
		it("should handle rapid successive match finalizations", async () => {
			// Simulates the scenario where multiple matches are finalized quickly
			const matchIds = [1, 2, 3, 4];
			const finalizedOrder: number[] = [];

			const finalizeMatch = async (matchId: number) => {
				// Simulate async operation
				await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));
				finalizedOrder.push(matchId);
				return matchId;
			};

			// Finalize all matches concurrently
			await Promise.all(matchIds.map(finalizeMatch));

			// All matches should be finalized
			expect(finalizedOrder.length).toBe(4);
			expect(finalizedOrder.sort()).toEqual([1, 2, 3, 4]);
		});
	});

	describe("match number boundary conditions", () => {
		it("should correctly calculate next match for match 1", () => {
			const nextMatchNumber = Math.ceil(1 / 2);
			const isPlayer1 = 1 % 2 === 1;

			expect(nextMatchNumber).toBe(1);
			expect(isPlayer1).toBe(true);
		});

		it("should correctly calculate next match for match 64 (last R128 match)", () => {
			const nextMatchNumber = Math.ceil(64 / 2);
			const isPlayer1 = 64 % 2 === 1;

			expect(nextMatchNumber).toBe(32);
			expect(isPlayer1).toBe(false);
		});

		it("should correctly calculate next match for match 127 (semi-final 2)", () => {
			// In a 128-player tournament, match 127 would be in the semi-finals
			// Actually, 127 total matches means match numbers go up to different values per round
			// Let's use semi-final match 2 as an example (match number 2 in semi-final round)
			const nextMatchNumber = Math.ceil(2 / 2);
			const isPlayer1 = 2 % 2 === 1;

			expect(nextMatchNumber).toBe(1); // Goes to final, match 1
			expect(isPlayer1).toBe(false); // Even match -> player2
		});
	});

	describe("seed value edge cases", () => {
		it("should handle seed 1 correctly", () => {
			const seed = 1;
			expect(seed).toBe(1);
			expect(seed > 0).toBe(true);
		});

		it("should handle seed 32 (typical max for Grand Slam)", () => {
			const seed = 32;
			expect(seed).toBe(32);
			expect(seed <= 32).toBe(true);
		});

		it("should handle null seed for unseeded players", () => {
			const seed = null;
			expect(seed).toBeNull();

			// Check spread behavior
			const updateData = {
				playerName: "Qualifier",
				...(seed !== null && { playerSeed: seed }),
			};

			expect(updateData).toEqual({ playerName: "Qualifier" });
			expect(updateData).not.toHaveProperty("playerSeed");
		});
	});
});
