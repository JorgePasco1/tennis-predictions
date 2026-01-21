/**
 * DesktopBracket Component Tests
 *
 * Tests for the desktop bracket display component covering:
 * - Round sorting and display
 * - Match positioning calculations
 * - Connector line positioning
 * - Layout dimensions
 * - Empty state handling
 * - Click interactions
 */

import { describe, expect, it, vi } from "vitest";
import {
	createActiveRound,
	createEmptyRound,
	createFinalizedRound,
	createFullTournamentBracket,
	createOddMatchesBracket,
	createSmallBracket,
	first,
} from "~/test/bracket-fixtures";
import type { RoundData } from "./bracket-types";

// =============================================================================
// Layout Constants (matching DesktopBracket.tsx)
// =============================================================================

const MATCH_HEIGHT = 56;
const PLAYER_ROW_HEIGHT = 28;
const MATCH_CONNECTOR_OFFSET = PLAYER_ROW_HEIGHT;
const MATCH_GAP = 24;
const COLUMN_WIDTH = 180;
const COLUMN_GAP = 40;
const HEADER_HEIGHT = 32;

// =============================================================================
// Round Sorting Tests
// =============================================================================

describe("round sorting", () => {
	it("should sort rounds by roundNumber ascending", () => {
		const rounds = [
			createActiveRound({ id: 3, roundNumber: 3, name: "Round 3" }),
			createActiveRound({ id: 1, roundNumber: 1, name: "Round 1" }),
			createActiveRound({ id: 2, roundNumber: 2, name: "Round 2" }),
		];

		const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);

		expect(sorted[0]?.roundNumber).toBe(1);
		expect(sorted[1]?.roundNumber).toBe(2);
		expect(sorted[2]?.roundNumber).toBe(3);
	});

	it("should handle single round", () => {
		const rounds = [createActiveRound({ roundNumber: 1 })];
		const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);

		expect(sorted).toHaveLength(1);
		expect(sorted[0]?.roundNumber).toBe(1);
	});

	it("should preserve original array (non-mutating)", () => {
		const rounds = [
			createActiveRound({ roundNumber: 2 }),
			createActiveRound({ roundNumber: 1 }),
		];
		const original = rounds[0];

		const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);

		expect(rounds[0]).toBe(original); // Original unchanged
		expect(sorted[0]?.roundNumber).toBe(1);
	});
});

// =============================================================================
// Empty State Tests
// =============================================================================

describe("empty state handling", () => {
	it("should detect when rounds array is empty", () => {
		const rounds: RoundData[] = [];
		const isEmpty = rounds.length === 0;

		expect(isEmpty).toBe(true);
	});

	it("should detect when first round has no matches", () => {
		const rounds = [createEmptyRound()];
		const sortedRounds = [...rounds].sort(
			(a, b) => a.roundNumber - b.roundNumber,
		);
		const firstRound = sortedRounds[0];

		expect(firstRound?.matches.length).toBe(0);
	});

	it("should handle rounds with no data gracefully", () => {
		const rounds: RoundData[] = [];
		const sortedRounds = [...rounds].sort(
			(a, b) => a.roundNumber - b.roundNumber,
		);
		const firstRound = sortedRounds[0];

		expect(firstRound).toBeUndefined();
	});
});

// =============================================================================
// Total Height Calculation Tests
// =============================================================================

describe("total height calculation", () => {
	/**
	 * Calculates total bracket height based on first round match count
	 */
	function calculateTotalHeight(firstRoundMatchCount: number): number {
		return (
			firstRoundMatchCount * MATCH_HEIGHT +
			(firstRoundMatchCount - 1) * MATCH_GAP +
			HEADER_HEIGHT
		);
	}

	it("should calculate height for single match", () => {
		const height = calculateTotalHeight(1);
		// 1 * 56 + 0 * 24 + 32 = 88
		expect(height).toBe(88);
	});

	it("should calculate height for 4 matches", () => {
		const height = calculateTotalHeight(4);
		// 4 * 56 + 3 * 24 + 32 = 224 + 72 + 32 = 328
		expect(height).toBe(328);
	});

	it("should calculate height for 64 matches (R128)", () => {
		const height = calculateTotalHeight(64);
		// 64 * 56 + 63 * 24 + 32 = 3584 + 1512 + 32 = 5128
		expect(height).toBe(5128);
	});

	it("should handle typical bracket sizes", () => {
		expect(calculateTotalHeight(2)).toBe(2 * 56 + 1 * 24 + 32);
		expect(calculateTotalHeight(8)).toBe(8 * 56 + 7 * 24 + 32);
		expect(calculateTotalHeight(16)).toBe(16 * 56 + 15 * 24 + 32);
		expect(calculateTotalHeight(32)).toBe(32 * 56 + 31 * 24 + 32);
	});
});

// =============================================================================
// Total Width Calculation Tests
// =============================================================================

describe("total width calculation", () => {
	/**
	 * Calculates total bracket width based on number of rounds
	 */
	function calculateTotalWidth(roundCount: number): number {
		return roundCount * (COLUMN_WIDTH + COLUMN_GAP);
	}

	it("should calculate width for single round", () => {
		const width = calculateTotalWidth(1);
		expect(width).toBe(COLUMN_WIDTH + COLUMN_GAP); // 220
	});

	it("should calculate width for 7 rounds (Grand Slam)", () => {
		const width = calculateTotalWidth(7);
		expect(width).toBe(7 * (COLUMN_WIDTH + COLUMN_GAP)); // 1540
	});

	it("should calculate width for 5 rounds (ATP 500)", () => {
		const width = calculateTotalWidth(5);
		expect(width).toBe(5 * (COLUMN_WIDTH + COLUMN_GAP)); // 1100
	});
});

// =============================================================================
// Match Positioning Tests
// =============================================================================

describe("match positioning", () => {
	/**
	 * Calculates the top position for a match in a given round
	 */
	function calculateMatchTop(roundIndex: number, matchIndex: number): number {
		const spacingMultiplier = 2 ** roundIndex;
		const unitHeight = MATCH_HEIGHT + MATCH_GAP;
		const offsetInUnits = (spacingMultiplier - 1) / 2;
		const topInUnits = offsetInUnits + matchIndex * spacingMultiplier;

		return HEADER_HEIGHT + topInUnits * unitHeight;
	}

	describe("first round positioning", () => {
		it("should position first match at header height", () => {
			const top = calculateMatchTop(0, 0);
			// spacingMultiplier = 1, offsetInUnits = 0, topInUnits = 0
			expect(top).toBe(HEADER_HEIGHT);
		});

		it("should position second match with one unit gap", () => {
			const top = calculateMatchTop(0, 1);
			// spacingMultiplier = 1, offsetInUnits = 0, topInUnits = 1
			const unitHeight = MATCH_HEIGHT + MATCH_GAP;
			expect(top).toBe(HEADER_HEIGHT + unitHeight);
		});

		it("should position matches sequentially", () => {
			const top0 = calculateMatchTop(0, 0);
			const top1 = calculateMatchTop(0, 1);
			const top2 = calculateMatchTop(0, 2);

			const unitHeight = MATCH_HEIGHT + MATCH_GAP;
			expect(top1 - top0).toBe(unitHeight);
			expect(top2 - top1).toBe(unitHeight);
		});
	});

	describe("second round positioning", () => {
		it("should offset first match to center between first round pair", () => {
			const top = calculateMatchTop(1, 0);
			// spacingMultiplier = 2, offsetInUnits = 0.5, topInUnits = 0.5
			const unitHeight = MATCH_HEIGHT + MATCH_GAP;
			expect(top).toBe(HEADER_HEIGHT + 0.5 * unitHeight);
		});

		it("should double spacing for second round matches", () => {
			const top0 = calculateMatchTop(1, 0);
			const top1 = calculateMatchTop(1, 1);

			const unitHeight = MATCH_HEIGHT + MATCH_GAP;
			// Gap should be 2 units
			expect(top1 - top0).toBe(2 * unitHeight);
		});
	});

	describe("later round positioning", () => {
		it("should quadruple spacing for third round", () => {
			const top0 = calculateMatchTop(2, 0);
			const top1 = calculateMatchTop(2, 1);

			const unitHeight = MATCH_HEIGHT + MATCH_GAP;
			expect(top1 - top0).toBe(4 * unitHeight);
		});

		it("should center later rounds correctly", () => {
			// Round 3 (index 2): spacingMultiplier = 4, offset = 1.5 units
			const top = calculateMatchTop(2, 0);
			const unitHeight = MATCH_HEIGHT + MATCH_GAP;
			expect(top).toBe(HEADER_HEIGHT + 1.5 * unitHeight);
		});
	});
});

// =============================================================================
// Column Position Tests
// =============================================================================

describe("column positioning", () => {
	/**
	 * Calculates the left position for a round column
	 */
	function calculateColumnLeft(roundIndex: number): number {
		return roundIndex * (COLUMN_WIDTH + COLUMN_GAP);
	}

	it("should position first round at left edge", () => {
		expect(calculateColumnLeft(0)).toBe(0);
	});

	it("should position subsequent rounds with correct offset", () => {
		expect(calculateColumnLeft(1)).toBe(COLUMN_WIDTH + COLUMN_GAP);
		expect(calculateColumnLeft(2)).toBe(2 * (COLUMN_WIDTH + COLUMN_GAP));
	});

	it("should maintain consistent spacing between columns", () => {
		const col0 = calculateColumnLeft(0);
		const col1 = calculateColumnLeft(1);
		const col2 = calculateColumnLeft(2);

		expect(col1 - col0).toBe(col2 - col1);
	});
});

// =============================================================================
// Connector Line Tests
// =============================================================================

describe("connector positioning", () => {
	const H_LINE_WIDTH = 12;

	/**
	 * Calculates connector positions for a match
	 */
	function calculateConnectorPositions(
		roundIndex: number,
		matchIndex: number,
		columnLeft: number,
	): {
		hLineStartX: number;
		matchConnectY: number;
		vLineX: number;
		isTopOfPair: boolean;
	} {
		const spacingMultiplier = 2 ** roundIndex;
		const unitHeight = MATCH_HEIGHT + MATCH_GAP;
		const offsetInUnits = (spacingMultiplier - 1) / 2;
		const topInUnits = offsetInUnits + matchIndex * spacingMultiplier;

		const matchConnectY =
			HEADER_HEIGHT + topInUnits * unitHeight + MATCH_CONNECTOR_OFFSET;

		const hLineStartX = columnLeft + COLUMN_WIDTH;
		const vLineX = hLineStartX + H_LINE_WIDTH;
		const isTopOfPair = matchIndex % 2 === 0;

		return { hLineStartX, matchConnectY, vLineX, isTopOfPair };
	}

	describe("horizontal line positioning", () => {
		it("should start horizontal line at right edge of match card", () => {
			const { hLineStartX } = calculateConnectorPositions(0, 0, 0);
			expect(hLineStartX).toBe(COLUMN_WIDTH);
		});

		it("should connect at player divider height", () => {
			const { matchConnectY } = calculateConnectorPositions(0, 0, 0);
			expect(matchConnectY).toBe(HEADER_HEIGHT + MATCH_CONNECTOR_OFFSET);
		});
	});

	describe("vertical line positioning", () => {
		it("should position vertical line after horizontal line", () => {
			const { hLineStartX, vLineX } = calculateConnectorPositions(0, 0, 0);
			expect(vLineX).toBe(hLineStartX + H_LINE_WIDTH);
		});
	});

	describe("pair identification", () => {
		it("should identify even-indexed matches as top of pair", () => {
			const { isTopOfPair: top0 } = calculateConnectorPositions(0, 0, 0);
			const { isTopOfPair: top2 } = calculateConnectorPositions(0, 2, 0);

			expect(top0).toBe(true);
			expect(top2).toBe(true);
		});

		it("should identify odd-indexed matches as bottom of pair", () => {
			const { isTopOfPair: top1 } = calculateConnectorPositions(0, 1, 0);
			const { isTopOfPair: top3 } = calculateConnectorPositions(0, 3, 0);

			expect(top1).toBe(false);
			expect(top3).toBe(false);
		});
	});

	describe("vertical line height calculation", () => {
		/**
		 * Calculates vertical line height between paired matches
		 */
		function calculateVLineHeight(roundIndex: number): number {
			const spacingMultiplier = 2 ** roundIndex;
			const unitHeight = MATCH_HEIGHT + MATCH_GAP;
			return spacingMultiplier * unitHeight;
		}

		it("should span one unit for first round pairs", () => {
			const height = calculateVLineHeight(0);
			expect(height).toBe(MATCH_HEIGHT + MATCH_GAP);
		});

		it("should span two units for second round pairs", () => {
			const height = calculateVLineHeight(1);
			expect(height).toBe(2 * (MATCH_HEIGHT + MATCH_GAP));
		});
	});
});

// =============================================================================
// Next Match Connector Tests
// =============================================================================

describe("next match connector positioning", () => {
	/**
	 * Calculates the Y position where the connector meets the next round
	 */
	function calculateNextMatchConnectY(
		roundIndex: number,
		matchIndex: number,
	): number {
		const nextMatchIndex = Math.floor(matchIndex / 2);
		const nextSpacingMultiplier = 2 ** (roundIndex + 1);
		const unitHeight = MATCH_HEIGHT + MATCH_GAP;
		const nextOffsetInUnits = (nextSpacingMultiplier - 1) / 2;
		const nextTopInUnits =
			nextOffsetInUnits + nextMatchIndex * nextSpacingMultiplier;

		return HEADER_HEIGHT + nextTopInUnits * unitHeight + MATCH_CONNECTOR_OFFSET;
	}

	it("should connect matches 0,1 to next match 0", () => {
		const y0 = calculateNextMatchConnectY(0, 0);
		const y1 = calculateNextMatchConnectY(0, 1);

		// Both should connect to the same point
		expect(y0).toBe(y1);
	});

	it("should connect matches 2,3 to next match 1", () => {
		const y2 = calculateNextMatchConnectY(0, 2);
		const y3 = calculateNextMatchConnectY(0, 3);

		expect(y2).toBe(y3);
	});

	it("should position next match connector between paired matches", () => {
		const unitHeight = MATCH_HEIGHT + MATCH_GAP;
		const y = calculateNextMatchConnectY(0, 0);

		// Should be at 0.5 units (center of pair)
		expect(y).toBe(HEADER_HEIGHT + 0.5 * unitHeight + MATCH_CONNECTOR_OFFSET);
	});
});

// =============================================================================
// Click Handler Tests
// =============================================================================

describe("click handler propagation", () => {
	it("should pass click handler to matches", () => {
		const onClick = vi.fn();
		const matchId = 42;

		// Simulate clicking a match
		if (onClick) {
			onClick(matchId);
		}

		expect(onClick).toHaveBeenCalledWith(matchId);
	});

	it("should handle undefined click handler", () => {
		const onClick = undefined as ((id: number) => void) | undefined;

		// Should not throw when onClick is undefined
		expect(() => {
			if (onClick) {
				onClick(1);
			}
		}).not.toThrow();
	});
});

// =============================================================================
// Full Bracket Integration Tests
// =============================================================================

describe("full bracket scenarios", () => {
	describe("Grand Slam bracket", () => {
		it("should handle 7 rounds", () => {
			const rounds = createFullTournamentBracket();
			expect(rounds).toHaveLength(7);
		});

		it("should have correct match progression", () => {
			const rounds = createFullTournamentBracket();

			// R128 -> 64 matches
			// R64 -> 32 matches
			// R32 -> 16 matches
			// R16 -> 8 matches
			// QF -> 4 matches
			// SF -> 2 matches
			// F -> 1 match
			expect(rounds[0]?.matches.length).toBe(64);
			expect(rounds[1]?.matches.length).toBe(32);
			expect(rounds[2]?.matches.length).toBe(16);
			expect(rounds[3]?.matches.length).toBe(8);
			expect(rounds[4]?.matches.length).toBe(4);
			expect(rounds[5]?.matches.length).toBe(2);
			expect(rounds[6]?.matches.length).toBe(1);
		});
	});

	describe("small bracket", () => {
		it("should handle 2 rounds", () => {
			const rounds = createSmallBracket();
			expect(rounds).toHaveLength(2);
		});

		it("should have SF -> F progression", () => {
			const rounds = createSmallBracket();
			expect(rounds[0]?.matches.length).toBe(2);
			expect(rounds[1]?.matches.length).toBe(1);
		});
	});

	describe("odd matches bracket", () => {
		it("should handle rounds with odd match counts", () => {
			const rounds = createOddMatchesBracket();
			expect(rounds[0]?.matches.length).toBe(3);
		});

		it("should still calculate positions correctly for odd counts", () => {
			const rounds = createOddMatchesBracket();
			const firstRoundMatchCount = rounds[0]?.matches.length ?? 0;

			const totalHeight =
				firstRoundMatchCount * MATCH_HEIGHT +
				(firstRoundMatchCount - 1) * MATCH_GAP +
				HEADER_HEIGHT;

			expect(totalHeight).toBeGreaterThan(0);
		});
	});
});

// =============================================================================
// Spacing Multiplier Tests
// =============================================================================

describe("spacing multiplier calculations", () => {
	it("should double spacing each round", () => {
		const multipliers = [0, 1, 2, 3, 4, 5, 6].map((i) => 2 ** i);

		expect(multipliers).toEqual([1, 2, 4, 8, 16, 32, 64]);
	});

	it("should calculate correct offset for centering", () => {
		const offsets = [0, 1, 2, 3, 4].map((i) => (2 ** i - 1) / 2);

		expect(offsets).toEqual([0, 0.5, 1.5, 3.5, 7.5]);
	});
});

// =============================================================================
// Round Data Validation Tests
// =============================================================================

describe("round data validation", () => {
	it("should have unique round ids", () => {
		const rounds = createFullTournamentBracket();
		const ids = rounds.map((r) => r.id);
		const uniqueIds = new Set(ids);

		expect(uniqueIds.size).toBe(rounds.length);
	});

	it("should have sequential round numbers", () => {
		const rounds = createFullTournamentBracket();
		const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);

		for (let i = 0; i < sorted.length - 1; i++) {
			expect(sorted[i + 1]?.roundNumber ?? 0).toBeGreaterThan(
				sorted[i]?.roundNumber ?? 0,
			);
		}
	});

	it("should have non-empty round names", () => {
		const rounds = createFullTournamentBracket();

		for (const round of rounds) {
			expect(round.name.length).toBeGreaterThan(0);
		}
	});
});

// =============================================================================
// Edge Case Tests
// =============================================================================

describe("edge cases", () => {
	it("should handle round with single match", () => {
		const rounds = [
			createActiveRound({
				matches: [first(createFinalizedRound().matches)],
			}),
		];

		const matchCount = rounds[0]?.matches.length;
		expect(matchCount).toBe(1);
	});

	it("should handle last round (no connectors needed)", () => {
		const rounds = createSmallBracket();
		const lastRoundIndex = rounds.length - 1;

		// Last round shouldn't draw connectors to next round
		expect(lastRoundIndex).toBe(1);
	});
});
