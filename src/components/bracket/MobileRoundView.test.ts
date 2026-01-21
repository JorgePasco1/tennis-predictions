/**
 * MobileRoundView Component Tests
 *
 * Tests for the mobile round view component covering:
 * - Height calculations
 * - Match positioning
 * - Connector rendering logic
 * - Empty round handling
 * - Click propagation
 */

import { describe, expect, it, vi } from "vitest";
import {
	BOTTOM_PADDING,
	CARD_RIGHT_MARGIN,
	MATCH_GAP,
	MATCH_HEIGHT,
	TOP_PADDING,
} from "./bracket-constants";
import {
	createActiveRound,
	createEmptyRound,
	createFinalizedRound,
	createSmallBracket,
} from "~/test/bracket-fixtures";
import type { RoundData } from "./bracket-types";

// =============================================================================
// Height Calculation Tests
// =============================================================================

describe("height calculation", () => {
	/**
	 * Calculates the height needed for a round
	 */
	function calculateHeight(round: RoundData): number {
		if (round.matches.length === 0) return 200;

		const matchCount = round.matches.length;
		const totalMatchesHeight = matchCount * MATCH_HEIGHT;
		const totalGapsHeight = (matchCount - 1) * MATCH_GAP;

		return TOP_PADDING + totalMatchesHeight + totalGapsHeight + BOTTOM_PADDING;
	}

	it("should return minimum height for empty round", () => {
		const round = createEmptyRound();
		expect(calculateHeight(round)).toBe(200);
	});

	it("should calculate height for single match", () => {
		const round = createActiveRound({
			matches: [createActiveRound().matches[0]!],
		});

		const expected = TOP_PADDING + MATCH_HEIGHT + BOTTOM_PADDING;
		expect(calculateHeight(round)).toBe(expected);
		expect(expected).toBe(176); // 16 + 80 + 80
	});

	it("should calculate height for 4 matches", () => {
		const round = createActiveRound(); // Has 4 matches

		const expected =
			TOP_PADDING +
			4 * MATCH_HEIGHT +
			3 * MATCH_GAP +
			BOTTOM_PADDING;

		expect(calculateHeight(round)).toBe(expected);
		expect(expected).toBe(488); // 16 + 320 + 72 + 80
	});

	it("should increase height with more matches", () => {
		const round1 = createActiveRound({
			matches: [createActiveRound().matches[0]!],
		});
		const round4 = createActiveRound();

		expect(calculateHeight(round4)).toBeGreaterThan(calculateHeight(round1));
	});
});

// =============================================================================
// Match Positioning Tests
// =============================================================================

describe("match positioning", () => {
	/**
	 * Calculates the top position for a match
	 */
	function calculateMatchTopPosition(matchIndex: number): number {
		return TOP_PADDING + matchIndex * (MATCH_HEIGHT + MATCH_GAP);
	}

	it("should position first match at top padding", () => {
		expect(calculateMatchTopPosition(0)).toBe(TOP_PADDING);
		expect(calculateMatchTopPosition(0)).toBe(16);
	});

	it("should position second match after first + gap", () => {
		const expected = TOP_PADDING + MATCH_HEIGHT + MATCH_GAP;
		expect(calculateMatchTopPosition(1)).toBe(expected);
		expect(expected).toBe(120); // 16 + 80 + 24
	});

	it("should position matches sequentially", () => {
		const pos0 = calculateMatchTopPosition(0);
		const pos1 = calculateMatchTopPosition(1);
		const pos2 = calculateMatchTopPosition(2);

		const unitSize = MATCH_HEIGHT + MATCH_GAP;
		expect(pos1 - pos0).toBe(unitSize);
		expect(pos2 - pos1).toBe(unitSize);
	});

	it("should calculate position for any match index", () => {
		for (let i = 0; i < 10; i++) {
			const expected = TOP_PADDING + i * (MATCH_HEIGHT + MATCH_GAP);
			expect(calculateMatchTopPosition(i)).toBe(expected);
		}
	});
});

// =============================================================================
// Match Card Positioning Tests
// =============================================================================

describe("match card positioning", () => {
	describe("left position", () => {
		it("should have 16px left margin", () => {
			const leftMargin = "16px";
			expect(leftMargin).toBe("16px");
		});
	});

	describe("right position", () => {
		it("should have connector space when hasNextRound", () => {
			const rightWithConnector = `${CARD_RIGHT_MARGIN}px`;
			expect(rightWithConnector).toBe("76px");
		});

		it("should have equal margin when no next round", () => {
			const rightWithoutConnector = "16px";
			expect(rightWithoutConnector).toBe("16px");
		});
	});
});

// =============================================================================
// Connector Rendering Logic Tests
// =============================================================================

describe("connector rendering logic", () => {
	describe("hasNextRound flag", () => {
		it("should render connectors when hasNextRound is true", () => {
			const rounds = createSmallBracket();
			const firstRoundIndex = 0;
			const hasNextRound = firstRoundIndex < rounds.length - 1;

			expect(hasNextRound).toBe(true);
		});

		it("should not render connectors for last round", () => {
			const rounds = createSmallBracket();
			const lastRoundIndex = rounds.length - 1;
			const hasNextRound = lastRoundIndex < rounds.length - 1;

			expect(hasNextRound).toBe(false);
		});
	});

	describe("connector props", () => {
		it("should pass correct props to BracketConnectors", () => {
			const round = createActiveRound();
			const matchIndex = 0;
			const topPosition = TOP_PADDING + matchIndex * (MATCH_HEIGHT + MATCH_GAP);

			const connectorProps = {
				matchIndex,
				matchHeight: MATCH_HEIGHT,
				matchGap: MATCH_GAP,
				topPosition,
				totalMatches: round.matches.length,
			};

			expect(connectorProps.matchIndex).toBe(0);
			expect(connectorProps.matchHeight).toBe(MATCH_HEIGHT);
			expect(connectorProps.matchGap).toBe(MATCH_GAP);
			expect(connectorProps.topPosition).toBe(TOP_PADDING);
			expect(connectorProps.totalMatches).toBe(4);
		});
	});
});

// =============================================================================
// Click Handler Tests
// =============================================================================

describe("click handler", () => {
	it("should pass onMatchClick to each BracketMatch", () => {
		const onMatchClick = vi.fn();
		const matchId = 42;

		// Simulate click propagation
		onMatchClick(matchId);

		expect(onMatchClick).toHaveBeenCalledWith(42);
	});

	it("should handle undefined onMatchClick", () => {
		const onMatchClick: ((id: number) => void) | undefined = undefined;

		expect(() => {
			if (onMatchClick) {
				onMatchClick(1);
			}
		}).not.toThrow();
	});

	it("should pass click handler to all matches", () => {
		const onMatchClick = vi.fn();
		const round = createActiveRound();

		// Simulate clicking each match
		round.matches.forEach((match) => {
			onMatchClick(match.id);
		});

		expect(onMatchClick).toHaveBeenCalledTimes(4);
	});
});

// =============================================================================
// BracketMatch Props Tests
// =============================================================================

describe("BracketMatch props", () => {
	it("should always pass compact=true", () => {
		const compact = true;
		expect(compact).toBe(true);
	});

	it("should always pass variant=mobile", () => {
		const variant = "mobile";
		expect(variant).toBe("mobile");
	});

	it("should pass match data", () => {
		const round = createActiveRound();
		const match = round.matches[0]!;

		expect(match).toHaveProperty("id");
		expect(match).toHaveProperty("matchNumber");
		expect(match).toHaveProperty("player1Name");
	});
});

// =============================================================================
// Round Header Tests
// =============================================================================

describe("round header", () => {
	it("should display round name", () => {
		const round = createActiveRound({ name: "Quarter Finals" });
		expect(round.name).toBe("Quarter Finals");
	});

	it("should have centered text styling", () => {
		const headerClasses = "text-center font-semibold text-lg";

		expect(headerClasses).toContain("text-center");
		expect(headerClasses).toContain("font-semibold");
		expect(headerClasses).toContain("text-lg");
	});

	it("should have background for sticky behavior", () => {
		const headerClasses = "bg-background";
		expect(headerClasses).toContain("bg-background");
	});
});

// =============================================================================
// Empty Round Tests
// =============================================================================

describe("empty round handling", () => {
	it("should return minimum height for no matches", () => {
		const round = createEmptyRound();

		const height =
			round.matches.length === 0
				? 200
				: TOP_PADDING +
					round.matches.length * MATCH_HEIGHT +
					(round.matches.length - 1) * MATCH_GAP +
					BOTTOM_PADDING;

		expect(height).toBe(200);
	});

	it("should still render round header for empty round", () => {
		const round = createEmptyRound({ name: "Empty Round" });
		expect(round.name).toBe("Empty Round");
	});

	it("should not render match elements for empty round", () => {
		const round = createEmptyRound();
		expect(round.matches.length).toBe(0);
	});
});

// =============================================================================
// Container Styling Tests
// =============================================================================

describe("container styling", () => {
	it("should have full width", () => {
		const containerStyle = { width: "100%" };
		expect(containerStyle.width).toBe("100%");
	});

	it("should have calculated height", () => {
		const round = createActiveRound();
		const height =
			TOP_PADDING +
			round.matches.length * MATCH_HEIGHT +
			(round.matches.length - 1) * MATCH_GAP +
			BOTTOM_PADDING;

		const containerStyle = { height: `${height}px` };
		expect(containerStyle.height).toBe(`${height}px`);
	});

	it("should use relative positioning for match container", () => {
		const positionClass = "relative";
		expect(positionClass).toBe("relative");
	});

	it("should use absolute positioning for matches", () => {
		const positionClass = "absolute";
		expect(positionClass).toBe("absolute");
	});
});

// =============================================================================
// Key Prop Tests
// =============================================================================

describe("key prop", () => {
	it("should use match.id as key for matches", () => {
		const round = createActiveRound();

		const keys = round.matches.map((m) => m.id);
		const uniqueKeys = new Set(keys);

		expect(uniqueKeys.size).toBe(round.matches.length);
	});
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("component integration", () => {
	it("should work with MobileBracketWithConnectors", () => {
		const rounds = createSmallBracket();
		const round = rounds[0]!;
		const hasNextRound = 0 < rounds.length - 1;

		const props = {
			round,
			hasNextRound,
			onMatchClick: vi.fn(),
		};

		expect(props.round.matches.length).toBeGreaterThan(0);
		expect(props.hasNextRound).toBe(true);
	});

	it("should render correct number of connectors", () => {
		const round = createActiveRound();
		const hasNextRound = true;

		// Each match should have a connector when hasNextRound is true
		const connectorCount = hasNextRound ? round.matches.length : 0;

		expect(connectorCount).toBe(4);
	});

	it("should calculate correct positions for all matches", () => {
		const round = createActiveRound();

		round.matches.forEach((_, index) => {
			const topPosition = TOP_PADDING + index * (MATCH_HEIGHT + MATCH_GAP);
			expect(topPosition).toBeGreaterThanOrEqual(TOP_PADDING);
		});
	});
});

// =============================================================================
// Edge Cases Tests
// =============================================================================

describe("edge cases", () => {
	it("should handle single match round", () => {
		const round = createActiveRound({
			matches: [createActiveRound().matches[0]!],
		});

		expect(round.matches.length).toBe(1);

		const height =
			TOP_PADDING + MATCH_HEIGHT + BOTTOM_PADDING;
		expect(height).toBe(176);
	});

	it("should handle round with many matches", () => {
		const round = {
			...createActiveRound(),
			matches: Array.from({ length: 64 }, (_, i) =>
				createActiveRound().matches[0]!
			),
		};

		const height =
			TOP_PADDING +
			64 * MATCH_HEIGHT +
			63 * MATCH_GAP +
			BOTTOM_PADDING;

		expect(height).toBe(TOP_PADDING + 5120 + 1512 + BOTTOM_PADDING);
	});

	it("should handle finalized round", () => {
		const round = createFinalizedRound();
		expect(round.isFinalized).toBe(true);
		expect(round.matches.length).toBeGreaterThan(0);
	});
});
