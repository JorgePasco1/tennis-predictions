/**
 * Round Utilities Tests
 *
 * Tests for round-related utility functions used in bracket components.
 */

import { describe, expect, it } from "vitest";
import { roundAbbreviationTestCases } from "~/test/bracket-fixtures";
import { getRoundAbbreviation } from "./round-utils";

describe("getRoundAbbreviation", () => {
	describe("standard round names", () => {
		it.each(roundAbbreviationTestCases)(
			'should return "$expected" for "$roundName"',
			({ roundName, roundNumber, expected }) => {
				expect(getRoundAbbreviation(roundName, roundNumber)).toBe(expected);
			}
		);
	});

	describe("Round of 128", () => {
		it("should return R128", () => {
			expect(getRoundAbbreviation("Round of 128", 1)).toBe("R128");
		});
	});

	describe("Round of 64", () => {
		it("should return R64", () => {
			expect(getRoundAbbreviation("Round of 64", 2)).toBe("R64");
		});
	});

	describe("Round of 32", () => {
		it("should return R32", () => {
			expect(getRoundAbbreviation("Round of 32", 3)).toBe("R32");
		});
	});

	describe("Round of 16", () => {
		it("should return R16", () => {
			expect(getRoundAbbreviation("Round of 16", 4)).toBe("R16");
		});
	});

	describe("Quarter Finals", () => {
		it("should return QF", () => {
			expect(getRoundAbbreviation("Quarter Finals", 5)).toBe("QF");
		});
	});

	describe("Semi Finals", () => {
		it("should return SF", () => {
			expect(getRoundAbbreviation("Semi Finals", 6)).toBe("SF");
		});
	});

	describe("Final", () => {
		it("should return F", () => {
			expect(getRoundAbbreviation("Final", 7)).toBe("F");
		});
	});

	describe("fallback behavior", () => {
		it("should fall back to round number for unknown round names", () => {
			expect(getRoundAbbreviation("Unknown Round", 8)).toBe("R8");
			expect(getRoundAbbreviation("Custom Round", 3)).toBe("R3");
		});

		it("should use round number prefix for numeric fallback", () => {
			expect(getRoundAbbreviation("", 1)).toBe("R1");
			expect(getRoundAbbreviation("Some Other Round", 10)).toBe("R10");
		});
	});

	describe("case sensitivity", () => {
		it("should be case sensitive for round names", () => {
			// The implementation uses exact matching, so case matters
			expect(getRoundAbbreviation("quarter finals", 5)).toBe("R5"); // lowercase doesn't match
			expect(getRoundAbbreviation("FINAL", 7)).toBe("R7"); // uppercase doesn't match
			expect(getRoundAbbreviation("Final", 7)).toBe("F"); // exact match works
		});
	});

	describe("edge cases", () => {
		it("should handle empty string", () => {
			expect(getRoundAbbreviation("", 1)).toBe("R1");
		});

		it("should handle round number 0", () => {
			expect(getRoundAbbreviation("Unknown", 0)).toBe("R0");
		});

		it("should handle large round numbers", () => {
			expect(getRoundAbbreviation("Unknown", 100)).toBe("R100");
		});

		it("should handle whitespace in name", () => {
			// Whitespace doesn't match standard names
			expect(getRoundAbbreviation(" Final ", 7)).toBe("R7");
			expect(getRoundAbbreviation("Final", 7)).toBe("F");
		});
	});

	describe("ATP tournament formats", () => {
		it("should handle Grand Slam format (128 draw)", () => {
			expect(getRoundAbbreviation("Round of 128", 1)).toBe("R128");
			expect(getRoundAbbreviation("Round of 64", 2)).toBe("R64");
			expect(getRoundAbbreviation("Round of 32", 3)).toBe("R32");
			expect(getRoundAbbreviation("Round of 16", 4)).toBe("R16");
			expect(getRoundAbbreviation("Quarter Finals", 5)).toBe("QF");
			expect(getRoundAbbreviation("Semi Finals", 6)).toBe("SF");
			expect(getRoundAbbreviation("Final", 7)).toBe("F");
		});

		it("should handle ATP 500 format (32 draw)", () => {
			expect(getRoundAbbreviation("Round of 32", 1)).toBe("R32");
			expect(getRoundAbbreviation("Round of 16", 2)).toBe("R16");
			expect(getRoundAbbreviation("Quarter Finals", 3)).toBe("QF");
			expect(getRoundAbbreviation("Semi Finals", 4)).toBe("SF");
			expect(getRoundAbbreviation("Final", 5)).toBe("F");
		});

		it("should handle ATP 250 format (28/32 draw)", () => {
			expect(getRoundAbbreviation("Round of 32", 1)).toBe("R32");
			expect(getRoundAbbreviation("Round of 16", 2)).toBe("R16");
			expect(getRoundAbbreviation("Quarter Finals", 3)).toBe("QF");
		});
	});

	describe("return type", () => {
		it("should always return a string", () => {
			expect(typeof getRoundAbbreviation("Final", 7)).toBe("string");
			expect(typeof getRoundAbbreviation("Unknown", 1)).toBe("string");
			expect(typeof getRoundAbbreviation("", 0)).toBe("string");
		});

		it("should never return empty string", () => {
			expect(getRoundAbbreviation("", 1).length).toBeGreaterThan(0);
			expect(getRoundAbbreviation("Final", 7).length).toBeGreaterThan(0);
		});
	});
});
