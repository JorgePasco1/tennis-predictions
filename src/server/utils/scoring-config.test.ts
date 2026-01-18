/**
 * Scoring Configuration Unit Tests
 *
 * Tests for the progressive round-based scoring system.
 */

import { describe, expect, it } from "vitest";
import { getScoringForRound } from "./scoring-config";

describe("getScoringForRound", () => {
	describe("known round names", () => {
		it("should return correct scoring for Round of 128", () => {
			const scoring = getScoringForRound("Round of 128");

			expect(scoring.pointsPerWinner).toBe(2);
			expect(scoring.pointsExactScore).toBe(3); // ceil(2 * 1.5)
		});

		it("should return correct scoring for Round of 64", () => {
			const scoring = getScoringForRound("Round of 64");

			expect(scoring.pointsPerWinner).toBe(3);
			expect(scoring.pointsExactScore).toBe(5); // ceil(3 * 1.5)
		});

		it("should return correct scoring for Round of 32", () => {
			const scoring = getScoringForRound("Round of 32");

			expect(scoring.pointsPerWinner).toBe(5);
			expect(scoring.pointsExactScore).toBe(8); // ceil(5 * 1.5)
		});

		it("should return correct scoring for Round of 16", () => {
			const scoring = getScoringForRound("Round of 16");

			expect(scoring.pointsPerWinner).toBe(8);
			expect(scoring.pointsExactScore).toBe(12); // ceil(8 * 1.5)
		});

		it("should return correct scoring for Quarter Finals", () => {
			const scoring = getScoringForRound("Quarter Finals");

			expect(scoring.pointsPerWinner).toBe(12);
			expect(scoring.pointsExactScore).toBe(18); // ceil(12 * 1.5)
		});

		it("should return correct scoring for Semi Finals", () => {
			const scoring = getScoringForRound("Semi Finals");

			expect(scoring.pointsPerWinner).toBe(18);
			expect(scoring.pointsExactScore).toBe(27); // ceil(18 * 1.5)
		});

		it("should return correct scoring for Final", () => {
			const scoring = getScoringForRound("Final");

			expect(scoring.pointsPerWinner).toBe(30);
			expect(scoring.pointsExactScore).toBe(45); // ceil(30 * 1.5)
		});
	});

	describe("progressive scoring validation", () => {
		it("should increase points as rounds progress", () => {
			const rounds = [
				"Round of 128",
				"Round of 64",
				"Round of 32",
				"Round of 16",
				"Quarter Finals",
				"Semi Finals",
				"Final",
			];

			let previousPoints = 0;
			for (const round of rounds) {
				const scoring = getScoringForRound(round);
				expect(scoring.pointsPerWinner).toBeGreaterThan(previousPoints);
				previousPoints = scoring.pointsPerWinner;
			}
		});

		it("should have exact score bonus be 50% more (rounded up)", () => {
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
				const expectedExactScore = Math.ceil(scoring.pointsPerWinner * 1.5);
				expect(scoring.pointsExactScore).toBe(expectedExactScore);
			}
		});
	});

	describe("unknown round names", () => {
		it("should return default scoring for unknown round", () => {
			const scoring = getScoringForRound("Unknown Round");

			expect(scoring.pointsPerWinner).toBe(10);
			expect(scoring.pointsExactScore).toBe(15); // ceil(10 * 1.5)
		});

		it("should return default scoring for empty string", () => {
			const scoring = getScoringForRound("");

			expect(scoring.pointsPerWinner).toBe(10);
			expect(scoring.pointsExactScore).toBe(15);
		});

		it("should return default scoring for misspelled round name", () => {
			const scoring = getScoringForRound("Round of 129"); // Misspelled

			expect(scoring.pointsPerWinner).toBe(10);
		});

		it("should be case-sensitive", () => {
			// The function uses exact string matching
			const scoring = getScoringForRound("round of 128"); // Lowercase

			expect(scoring.pointsPerWinner).toBe(10); // Default, not 2
		});
	});

	describe("edge cases", () => {
		it("should handle whitespace variations", () => {
			// Note: Current implementation does exact matching
			// These would return default values
			const scoringWithSpaces = getScoringForRound("  Round of 128  ");
			expect(scoringWithSpaces.pointsPerWinner).toBe(10); // Default

			const scoringExact = getScoringForRound("Round of 128");
			expect(scoringExact.pointsPerWinner).toBe(2);
		});

		it("should handle special tournament round names", () => {
			// ATP 250 might have different round names
			const scoring = getScoringForRound("First Round");
			expect(scoring.pointsPerWinner).toBe(10); // Default
		});
	});

	describe("scoring calculation examples", () => {
		it("should calculate correct total for correct winner + exact score in R128", () => {
			const scoring = getScoringForRound("Round of 128");
			const total = scoring.pointsPerWinner + scoring.pointsExactScore;

			expect(total).toBe(5); // 2 + 3
		});

		it("should calculate correct total for correct winner + exact score in Final", () => {
			const scoring = getScoringForRound("Final");
			const total = scoring.pointsPerWinner + scoring.pointsExactScore;

			expect(total).toBe(75); // 30 + 45
		});

		it("should calculate correct winner-only points for Semi Finals", () => {
			const scoring = getScoringForRound("Semi Finals");

			expect(scoring.pointsPerWinner).toBe(18);
		});
	});
});

// =============================================================================
// Table-driven tests for all scoring values
// =============================================================================

describe("scoring values table", () => {
	const expectedScoring = [
		{ round: "Round of 128", winner: 2, exact: 3 },
		{ round: "Round of 64", winner: 3, exact: 5 },
		{ round: "Round of 32", winner: 5, exact: 8 },
		{ round: "Round of 16", winner: 8, exact: 12 },
		{ round: "Quarter Finals", winner: 12, exact: 18 },
		{ round: "Semi Finals", winner: 18, exact: 27 },
		{ round: "Final", winner: 30, exact: 45 },
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
