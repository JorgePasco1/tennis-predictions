/**
 * Scoring Configuration Unit Tests
 *
 * Tests for the hybrid round-based scoring system.
 * See docs/SCORING.md for full scoring documentation.
 */

import { describe, expect, it } from "vitest";
import { getScoringForRound } from "./scoring-config";

describe("getScoringForRound", () => {
	describe("known round names", () => {
		it("should return correct scoring for Round of 128", () => {
			const scoring = getScoringForRound("Round of 128");

			expect(scoring.pointsPerWinner).toBe(10);
			expect(scoring.pointsExactScore).toBe(5);
		});

		it("should return correct scoring for Round of 64", () => {
			const scoring = getScoringForRound("Round of 64");

			expect(scoring.pointsPerWinner).toBe(10);
			expect(scoring.pointsExactScore).toBe(5);
		});

		it("should return correct scoring for Round of 32", () => {
			const scoring = getScoringForRound("Round of 32");

			expect(scoring.pointsPerWinner).toBe(10);
			expect(scoring.pointsExactScore).toBe(5);
		});

		it("should return correct scoring for Round of 16", () => {
			const scoring = getScoringForRound("Round of 16");

			expect(scoring.pointsPerWinner).toBe(10);
			expect(scoring.pointsExactScore).toBe(5);
		});

		it("should return correct scoring for Quarter Finals", () => {
			const scoring = getScoringForRound("Quarter Finals");

			expect(scoring.pointsPerWinner).toBe(10);
			expect(scoring.pointsExactScore).toBe(5);
		});

		it("should return correct scoring for Semi Finals", () => {
			const scoring = getScoringForRound("Semi Finals");

			expect(scoring.pointsPerWinner).toBe(12);
			expect(scoring.pointsExactScore).toBe(6);
		});

		it("should return correct scoring for Final", () => {
			const scoring = getScoringForRound("Final");

			expect(scoring.pointsPerWinner).toBe(15);
			expect(scoring.pointsExactScore).toBe(8);
		});
	});

	describe("hybrid scoring validation", () => {
		it("should use flat scoring for early rounds (R128 through QF)", () => {
			const earlyRounds = [
				"Round of 128",
				"Round of 64",
				"Round of 32",
				"Round of 16",
				"Quarter Finals",
			];

			for (const round of earlyRounds) {
				const scoring = getScoringForRound(round);
				expect(scoring.pointsPerWinner).toBe(10);
				expect(scoring.pointsExactScore).toBe(5);
			}
		});

		it("should have increased scoring for Semi Finals", () => {
			const scoring = getScoringForRound("Semi Finals");

			expect(scoring.pointsPerWinner).toBe(12); // +20% from base
			expect(scoring.pointsExactScore).toBe(6);
		});

		it("should have highest scoring for Final", () => {
			const scoring = getScoringForRound("Final");

			expect(scoring.pointsPerWinner).toBe(15); // +50% from base
			expect(scoring.pointsExactScore).toBe(8);
		});

		it("should have exact score bonus approximately 50% of winner points", () => {
			const rounds = [
				"Round of 128",
				"Round of 64",
				"Round of 32",
				"Round of 16",
				"Quarter Finals",
				"Semi Finals",
				"Final",
			];

			for (const round of rounds) {
				const scoring = getScoringForRound(round);
				const ratio = scoring.pointsExactScore / scoring.pointsPerWinner;
				// Ratio should be approximately 0.5 (between 0.4 and 0.6)
				expect(ratio).toBeGreaterThanOrEqual(0.4);
				expect(ratio).toBeLessThanOrEqual(0.6);
			}
		});
	});

	describe("unknown round names", () => {
		it("should return default scoring for unknown round", () => {
			const scoring = getScoringForRound("Unknown Round");

			expect(scoring.pointsPerWinner).toBe(10);
			expect(scoring.pointsExactScore).toBe(5);
		});

		it("should return default scoring for empty string", () => {
			const scoring = getScoringForRound("");

			expect(scoring.pointsPerWinner).toBe(10);
			expect(scoring.pointsExactScore).toBe(5);
		});

		it("should return default scoring for misspelled round name", () => {
			const scoring = getScoringForRound("Round of 129"); // Misspelled

			expect(scoring.pointsPerWinner).toBe(10);
			expect(scoring.pointsExactScore).toBe(5);
		});

		it("should be case-sensitive", () => {
			// The function uses exact string matching
			const scoring = getScoringForRound("round of 128"); // Lowercase

			expect(scoring.pointsPerWinner).toBe(10); // Default
			expect(scoring.pointsExactScore).toBe(5);
		});
	});

	describe("edge cases", () => {
		it("should handle whitespace variations", () => {
			// Note: Current implementation does exact matching
			// These would return default values
			const scoringWithSpaces = getScoringForRound("  Round of 128  ");
			expect(scoringWithSpaces.pointsPerWinner).toBe(10); // Default

			const scoringExact = getScoringForRound("Round of 128");
			expect(scoringExact.pointsPerWinner).toBe(10);
		});

		it("should handle special tournament round names", () => {
			// ATP 250 might have different round names
			const scoring = getScoringForRound("First Round");
			expect(scoring.pointsPerWinner).toBe(10); // Default
			expect(scoring.pointsExactScore).toBe(5);
		});
	});

	describe("scoring calculation examples", () => {
		it("should calculate correct total for correct winner + exact score in R128", () => {
			const scoring = getScoringForRound("Round of 128");
			const total = scoring.pointsPerWinner + scoring.pointsExactScore;

			expect(total).toBe(15); // 10 + 5
		});

		it("should calculate correct total for correct winner + exact score in Final", () => {
			const scoring = getScoringForRound("Final");
			const total = scoring.pointsPerWinner + scoring.pointsExactScore;

			expect(total).toBe(23); // 15 + 8
		});

		it("should calculate correct winner-only points for Semi Finals", () => {
			const scoring = getScoringForRound("Semi Finals");

			expect(scoring.pointsPerWinner).toBe(12);
		});
	});
});

// =============================================================================
// Table-driven tests for all scoring values
// =============================================================================

describe("scoring values table", () => {
	const expectedScoring = [
		{ round: "Round of 128", winner: 10, exact: 5 },
		{ round: "Round of 64", winner: 10, exact: 5 },
		{ round: "Round of 32", winner: 10, exact: 5 },
		{ round: "Round of 16", winner: 10, exact: 5 },
		{ round: "Quarter Finals", winner: 10, exact: 5 },
		{ round: "Semi Finals", winner: 12, exact: 6 },
		{ round: "Final", winner: 15, exact: 8 },
	];

	it.each(
		expectedScoring,
	)("should return $winner points for winner and $exact for exact score in $round", ({
		round,
		winner,
		exact,
	}) => {
		const scoring = getScoringForRound(round);

		expect(scoring.pointsPerWinner).toBe(winner);
		expect(scoring.pointsExactScore).toBe(exact);
	});
});
