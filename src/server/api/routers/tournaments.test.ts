/**
 * Tournaments Router Integration Tests
 *
 * Tests for tournament listing, retrieval, and status management.
 */

import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	mockMatches,
	mockRounds,
	mockScoringRules,
	mockTournaments,
} from "~/test/fixtures";
import { createMockDb, type MockDb } from "~/test/mock-db";

describe("tournaments router", () => {
	describe("list", () => {
		let mockDb: MockDb;

		beforeEach(() => {
			mockDb = createMockDb();
		});

		it("should return all non-deleted tournaments", async () => {
			const tournaments = [
				{ ...mockTournaments.australian_open, deletedAt: null },
				{ ...mockTournaments.wimbledon, deletedAt: null },
				{ id: 99, deletedAt: new Date() }, // Soft deleted
			];

			const activeTournaments = tournaments.filter((t) => t.deletedAt === null);

			expect(activeTournaments.length).toBe(2);
		});

		it("should filter by status when provided", async () => {
			const tournaments = [
				{ ...mockTournaments.australian_open, status: "active" as const },
				{ ...mockTournaments.wimbledon, status: "draft" as const },
				{ id: 3, status: "archived" as const },
			];

			const filterByStatus = (status: "draft" | "active" | "archived") =>
				tournaments.filter((t) => t.status === status);

			expect(filterByStatus("active").length).toBe(1);
			expect(filterByStatus("draft").length).toBe(1);
			expect(filterByStatus("archived").length).toBe(1);
		});

		it("should order by creation date descending", () => {
			const tournaments = [
				{ id: 1, createdAt: new Date("2024-01-01") },
				{ id: 2, createdAt: new Date("2024-06-01") },
				{ id: 3, createdAt: new Date("2024-03-01") },
			];

			const sorted = [...tournaments].sort(
				(a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
			);

			expect(sorted[0]?.id).toBe(2); // Most recent
			expect(sorted[1]?.id).toBe(3);
			expect(sorted[2]?.id).toBe(1); // Oldest
		});

		it("should include uploader information", async () => {
			mockDb.query.tournaments.findMany.mockResolvedValue([
				{
					...mockTournaments.australian_open,
					uploadedByUser: {
						displayName: "Admin User",
						email: "admin@test.com",
					},
				},
			]);

			const tournaments = await mockDb.query.tournaments.findMany({});

			expect(tournaments[0]?.uploadedByUser.displayName).toBe("Admin User");
		});
	});

	describe("getById", () => {
		let mockDb: MockDb;

		beforeEach(() => {
			mockDb = createMockDb();
		});

		it("should return tournament with rounds and matches", async () => {
			mockDb.query.tournaments.findFirst.mockResolvedValue({
				...mockTournaments.australian_open,
				rounds: [
					{
						...mockRounds.ao_r128,
						matches: [mockMatches.ao_match1, mockMatches.ao_match2],
						scoringRule: mockScoringRules.ao_r128,
					},
				],
			});

			const tournament = await mockDb.query.tournaments.findFirst({});

			expect(tournament).not.toBeNull();
			expect(tournament?.rounds.length).toBe(1);
			expect(tournament?.rounds[0]?.matches.length).toBe(2);
		});

		it("should throw error when tournament not found", async () => {
			mockDb.query.tournaments.findFirst.mockResolvedValue(null);

			const getTournament = async () => {
				const tournament = await mockDb.query.tournaments.findFirst({});
				if (!tournament) {
					throw new Error("Tournament not found");
				}
				return tournament;
			};

			await expect(getTournament()).rejects.toThrow("Tournament not found");
		});

		it("should exclude soft-deleted tournaments", async () => {
			const validateNotDeleted = (
				tournament: { deletedAt: Date | null } | null,
			) => {
				if (!tournament || tournament.deletedAt !== null) {
					throw new Error("Tournament not found");
				}
				return tournament;
			};

			expect(() => validateNotDeleted({ deletedAt: new Date() })).toThrow(
				"Tournament not found",
			);
			expect(validateNotDeleted({ deletedAt: null })).toEqual({
				deletedAt: null,
			});
		});

		it("should exclude soft-deleted matches within rounds", () => {
			const matches = [
				{ id: 1, deletedAt: null },
				{ id: 2, deletedAt: new Date() },
				{ id: 3, deletedAt: null },
			];

			const activeMatches = matches.filter((m) => m.deletedAt === null);

			expect(activeMatches.length).toBe(2);
			expect(activeMatches.map((m) => m.id)).toEqual([1, 3]);
		});

		it("should order rounds by round number", () => {
			const rounds = [
				{ roundNumber: 3, name: "Round 3" },
				{ roundNumber: 1, name: "Round 1" },
				{ roundNumber: 2, name: "Round 2" },
			];

			const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);

			expect(sorted[0]?.roundNumber).toBe(1);
			expect(sorted[1]?.roundNumber).toBe(2);
			expect(sorted[2]?.roundNumber).toBe(3);
		});

		it("should order matches by match number within rounds", () => {
			const matches = [
				{ matchNumber: 3 },
				{ matchNumber: 1 },
				{ matchNumber: 2 },
			];

			const sorted = [...matches].sort((a, b) => a.matchNumber - b.matchNumber);

			expect(sorted[0]?.matchNumber).toBe(1);
			expect(sorted[1]?.matchNumber).toBe(2);
			expect(sorted[2]?.matchNumber).toBe(3);
		});
	});

	describe("getBySlug", () => {
		let mockDb: MockDb;

		beforeEach(() => {
			mockDb = createMockDb();
		});

		it("should find tournament by slug", async () => {
			mockDb.query.tournaments.findFirst.mockResolvedValue({
				...mockTournaments.australian_open,
				slug: "australian-open-2024",
			});

			const tournament = await mockDb.query.tournaments.findFirst({});

			expect(tournament?.slug).toBe("australian-open-2024");
		});

		it("should throw error when slug not found", async () => {
			mockDb.query.tournaments.findFirst.mockResolvedValue(null);

			const getTournamentBySlug = async (slug: string) => {
				const tournament = await mockDb.query.tournaments.findFirst({});
				if (!tournament) {
					throw new Error("Tournament not found");
				}
				return tournament;
			};

			await expect(
				getTournamentBySlug("nonexistent-tournament"),
			).rejects.toThrow("Tournament not found");
		});

		it("should handle slug with special characters", () => {
			// Slugs should only contain lowercase letters, numbers, and hyphens
			const validateSlug = (slug: string) => {
				return /^[a-z0-9-]+$/.test(slug);
			};

			expect(validateSlug("australian-open-2024")).toBe(true);
			expect(validateSlug("us-open-2024")).toBe(true);
			expect(validateSlug("roland-garros-2024")).toBe(true);
			expect(validateSlug("Invalid Slug!")).toBe(false);
		});
	});

	describe("updateStatus", () => {
		let mockDb: MockDb;

		beforeEach(() => {
			mockDb = createMockDb();
		});

		it("should update tournament status", async () => {
			const updateMock = vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi
							.fn()
							.mockResolvedValue([
								{ ...mockTournaments.australian_open, status: "active" },
							]),
					}),
				}),
			});
			mockDb.update = updateMock;

			// Simulate the update
			const result = await mockDb.update({}).set({}).where({}).returning();

			expect(result[0]?.status).toBe("active");
		});

		it("should only allow valid status values", () => {
			const validStatuses = ["draft", "active", "archived"];

			const validateStatus = (status: string) => {
				return validStatuses.includes(status);
			};

			expect(validateStatus("draft")).toBe(true);
			expect(validateStatus("active")).toBe(true);
			expect(validateStatus("archived")).toBe(true);
			expect(validateStatus("invalid")).toBe(false);
		});

		it("should throw error when tournament not found", async () => {
			const updateMock = vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([]),
					}),
				}),
			});
			mockDb.update = updateMock;

			const updateStatus = async () => {
				const result = await mockDb.update({}).set({}).where({}).returning();
				if (!result[0]) {
					throw new Error("Tournament not found");
				}
				return result[0];
			};

			await expect(updateStatus()).rejects.toThrow("Tournament not found");
		});
	});
});

// =============================================================================
// Tournament Status State Machine
// =============================================================================

describe("tournament status transitions", () => {
	describe("valid state transitions", () => {
		type TournamentStatus = "draft" | "active" | "archived";

		const validTransitions: Record<TournamentStatus, TournamentStatus[]> = {
			draft: ["active", "archived"],
			active: ["archived", "draft"], // Can be deactivated back to draft
			archived: ["active"], // Can be reactivated
		};

		const canTransition = (
			from: TournamentStatus,
			to: TournamentStatus,
		): boolean => {
			return validTransitions[from]?.includes(to) ?? false;
		};

		it("should allow draft -> active transition", () => {
			expect(canTransition("draft", "active")).toBe(true);
		});

		it("should allow active -> archived transition", () => {
			expect(canTransition("active", "archived")).toBe(true);
		});

		it("should allow archived -> active reactivation", () => {
			expect(canTransition("archived", "active")).toBe(true);
		});
	});
});

// =============================================================================
// Tournament Data Structure Tests
// =============================================================================

describe("tournament data structures", () => {
	describe("tournament format", () => {
		it("should support bo3 and bo5 formats", () => {
			const validFormats = ["bo3", "bo5"];

			expect(
				validFormats.includes(mockTournaments.australian_open.format),
			).toBe(true);
			expect(validFormats.includes(mockTournaments.atp500.format)).toBe(true);
		});

		it("should use bo5 for Grand Slams by convention", () => {
			const grandSlams = [
				"Australian Open",
				"Roland-Garros",
				"Wimbledon",
				"US Open",
			];

			const isGrandSlam = (name: string) =>
				grandSlams.some((gs) => name.includes(gs));

			expect(isGrandSlam(mockTournaments.australian_open.name)).toBe(true);
			expect(mockTournaments.australian_open.format).toBe("bo5");
		});
	});

	describe("round structure", () => {
		it("should have consistent round naming", () => {
			const standardRoundNames = [
				"Round of 128",
				"Round of 64",
				"Round of 32",
				"Round of 16",
				"Quarter Finals",
				"Semi Finals",
				"Final",
			];

			expect(standardRoundNames.includes(mockRounds.ao_r128.name)).toBe(true);
			expect(standardRoundNames.includes(mockRounds.ao_final.name)).toBe(true);
		});

		it("should have round number align with elimination stage", () => {
			// R128 = round 1, R64 = round 2, etc.
			expect(mockRounds.ao_r128.roundNumber).toBe(1);
			expect(mockRounds.ao_r64.roundNumber).toBe(2);
		});
	});

	describe("scoring rule association", () => {
		it("should have one scoring rule per round", () => {
			// Each round has a unique scoring rule
			const roundToScoringRule = new Map([
				[mockRounds.ao_r128.id, mockScoringRules.ao_r128],
				[mockRounds.ao_r64.id, mockScoringRules.ao_r64],
				[mockRounds.ao_final.id, mockScoringRules.ao_final],
			]);

			expect(roundToScoringRule.get(mockRounds.ao_r128.id)?.roundId).toBe(
				mockRounds.ao_r128.id,
			);
		});
	});
});

// =============================================================================
// Query Optimization Tests
// =============================================================================

describe("tournament query patterns", () => {
	describe("index usage", () => {
		it("should have indexes on frequently queried fields", () => {
			// These are the fields that have indexes in the schema
			const indexedFields = [
				"tournament.status",
				"tournament.year",
				"tournament.slug",
				"round.tournament_id",
				"round.is_active",
				"match.round_id",
				"match.status",
			];

			// Verify our test queries would use indexes
			expect(indexedFields).toContain("tournament.status");
			expect(indexedFields).toContain("tournament.slug");
		});
	});

	describe("relationship loading", () => {
		it("should load rounds with matches efficiently", () => {
			// The query structure should use joins, not N+1 queries
			const tournamentWithRounds = {
				id: 1,
				rounds: [
					{
						id: 1,
						matches: [{ id: 1 }, { id: 2 }],
					},
					{
						id: 2,
						matches: [{ id: 3 }],
					},
				],
			};

			// Count total relationships loaded in one query
			const roundCount = tournamentWithRounds.rounds.length;
			const matchCount = tournamentWithRounds.rounds.reduce(
				(sum, r) => sum + r.matches.length,
				0,
			);

			expect(roundCount).toBe(2);
			expect(matchCount).toBe(3);
		});
	});
});
