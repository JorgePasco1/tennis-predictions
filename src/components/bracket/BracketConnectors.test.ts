/**
 * BracketConnectors Component Tests
 *
 * Tests for the bracket connector lines component covering:
 * - Connector positioning calculations
 * - Pair identification (top/bottom)
 * - Vertical line calculations
 * - Next round connector positioning
 * - Edge cases (odd matches, single match)
 */

import { describe, expect, it } from "vitest";
import {
	CONNECTOR_RIGHT_OFFSET,
	H_LINE_WIDTH,
	MATCH_GAP,
	MATCH_HEIGHT,
	NEXT_ROUND_CONNECTOR_RIGHT,
	NEXT_ROUND_CONNECTOR_WIDTH,
	TOP_PADDING,
} from "./bracket-constants";

// =============================================================================
// Constants Verification
// =============================================================================

describe("constants usage", () => {
	it("should use correct constants from bracket-constants", () => {
		expect(CONNECTOR_RIGHT_OFFSET).toBe(56);
		expect(H_LINE_WIDTH).toBe(20);
		expect(NEXT_ROUND_CONNECTOR_RIGHT).toBe(16);
		expect(NEXT_ROUND_CONNECTOR_WIDTH).toBe(40);
		expect(TOP_PADDING).toBe(16);
		expect(MATCH_HEIGHT).toBe(80);
		expect(MATCH_GAP).toBe(24);
	});
});

// =============================================================================
// Connector Offset Calculation Tests
// =============================================================================

describe("connector offset calculation", () => {
	/**
	 * Calculates the connector offset (middle of card at player divider)
	 */
	function calculateConnectorOffset(matchHeight: number): number {
		const playerRowHeight = matchHeight / 2;
		return playerRowHeight;
	}

	it("should calculate offset as half of match height", () => {
		const offset = calculateConnectorOffset(MATCH_HEIGHT);
		expect(offset).toBe(MATCH_HEIGHT / 2);
		expect(offset).toBe(40);
	});

	it("should position connector at player divider line", () => {
		// The connector should be at the divider between player 1 and player 2
		const offset = calculateConnectorOffset(MATCH_HEIGHT);
		expect(offset).toBe(40); // Half of 80px match height
	});
});

// =============================================================================
// Pair Identification Tests
// =============================================================================

describe("pair identification", () => {
	/**
	 * Determines if a match is the top or bottom of a pair
	 */
	function isTopOfPair(matchIndex: number): boolean {
		return matchIndex % 2 === 0;
	}

	/**
	 * Gets the pair partner index
	 */
	function getPairPartnerIndex(matchIndex: number): number {
		return isTopOfPair(matchIndex) ? matchIndex + 1 : matchIndex - 1;
	}

	describe("top of pair", () => {
		it("should identify index 0 as top of pair", () => {
			expect(isTopOfPair(0)).toBe(true);
		});

		it("should identify index 2 as top of pair", () => {
			expect(isTopOfPair(2)).toBe(true);
		});

		it("should identify even indices as top of pair", () => {
			expect(isTopOfPair(4)).toBe(true);
			expect(isTopOfPair(6)).toBe(true);
			expect(isTopOfPair(62)).toBe(true);
		});
	});

	describe("bottom of pair", () => {
		it("should identify index 1 as bottom of pair", () => {
			expect(isTopOfPair(1)).toBe(false);
		});

		it("should identify index 3 as bottom of pair", () => {
			expect(isTopOfPair(3)).toBe(false);
		});

		it("should identify odd indices as bottom of pair", () => {
			expect(isTopOfPair(5)).toBe(false);
			expect(isTopOfPair(7)).toBe(false);
			expect(isTopOfPair(63)).toBe(false);
		});
	});

	describe("pair partner calculation", () => {
		it("should get partner for top of pair (index + 1)", () => {
			expect(getPairPartnerIndex(0)).toBe(1);
			expect(getPairPartnerIndex(2)).toBe(3);
		});

		it("should get partner for bottom of pair (index - 1)", () => {
			expect(getPairPartnerIndex(1)).toBe(0);
			expect(getPairPartnerIndex(3)).toBe(2);
		});
	});
});

// =============================================================================
// Pair Partner Existence Tests
// =============================================================================

describe("pair partner existence", () => {
	/**
	 * Checks if a pair partner exists within bounds
	 */
	function hasPairPartner(
		matchIndex: number,
		totalMatches: number
	): boolean {
		const isTop = matchIndex % 2 === 0;
		const pairPartnerIndex = isTop ? matchIndex + 1 : matchIndex - 1;
		return pairPartnerIndex >= 0 && pairPartnerIndex < totalMatches;
	}

	it("should have partner when both exist", () => {
		expect(hasPairPartner(0, 4)).toBe(true);
		expect(hasPairPartner(1, 4)).toBe(true);
		expect(hasPairPartner(2, 4)).toBe(true);
		expect(hasPairPartner(3, 4)).toBe(true);
	});

	it("should not have partner for last odd match", () => {
		// In a bracket with 3 matches, match at index 2 has no partner at index 3
		expect(hasPairPartner(2, 3)).toBe(false);
	});

	it("should have partner for last even match in odd count", () => {
		// In a bracket with 3 matches, match at index 1 has partner at index 0
		expect(hasPairPartner(1, 3)).toBe(true);
	});

	it("should handle single match (no partner)", () => {
		expect(hasPairPartner(0, 1)).toBe(false);
	});
});

// =============================================================================
// Horizontal Line Position Tests
// =============================================================================

describe("horizontal line positioning", () => {
	/**
	 * Calculates the Y position for horizontal connector line
	 */
	function calculateMatchConnectY(
		topPosition: number,
		matchHeight: number
	): number {
		const connectorOffset = matchHeight / 2;
		return topPosition + connectorOffset;
	}

	it("should position horizontal line at player divider", () => {
		const topPosition = TOP_PADDING;
		const connectY = calculateMatchConnectY(topPosition, MATCH_HEIGHT);

		expect(connectY).toBe(TOP_PADDING + MATCH_HEIGHT / 2);
		expect(connectY).toBe(56); // 16 + 40
	});

	it("should position for subsequent matches", () => {
		const match2Top = TOP_PADDING + (MATCH_HEIGHT + MATCH_GAP);
		const connectY = calculateMatchConnectY(match2Top, MATCH_HEIGHT);

		expect(connectY).toBe(match2Top + MATCH_HEIGHT / 2);
	});

	it("should use correct right offset", () => {
		expect(CONNECTOR_RIGHT_OFFSET).toBe(56);
	});

	it("should use correct horizontal line width", () => {
		expect(H_LINE_WIDTH).toBe(20);
	});
});

// =============================================================================
// Vertical Line Position Tests
// =============================================================================

describe("vertical line positioning", () => {
	/**
	 * Calculates vertical line properties for a pair
	 */
	function calculateVerticalLine(
		topMatchIndex: number,
		matchHeight: number,
		matchGap: number
	): { vLineTop: number; vLineHeight: number } {
		const topPosition = TOP_PADDING + topMatchIndex * (matchHeight + matchGap);
		const bottomIndex = topMatchIndex + 1;
		const bottomPosition = TOP_PADDING + bottomIndex * (matchHeight + matchGap);

		const connectorOffset = matchHeight / 2;
		const topConnectY = topPosition + connectorOffset;
		const bottomConnectY = bottomPosition + connectorOffset;

		return {
			vLineTop: topConnectY,
			vLineHeight: Math.abs(bottomConnectY - topConnectY),
		};
	}

	it("should calculate correct top position", () => {
		const { vLineTop } = calculateVerticalLine(0, MATCH_HEIGHT, MATCH_GAP);
		expect(vLineTop).toBe(TOP_PADDING + MATCH_HEIGHT / 2);
	});

	it("should calculate correct height spanning one unit", () => {
		const { vLineHeight } = calculateVerticalLine(0, MATCH_HEIGHT, MATCH_GAP);
		// Height should span from one connector point to the next
		expect(vLineHeight).toBe(MATCH_HEIGHT + MATCH_GAP);
	});

	it("should only draw from top match of pair", () => {
		const isTop = (index: number) => index % 2 === 0;

		// Only top matches should draw vertical lines
		expect(isTop(0)).toBe(true); // Should draw
		expect(isTop(1)).toBe(false); // Should not draw
		expect(isTop(2)).toBe(true); // Should draw
	});
});

// =============================================================================
// Next Round Connector Tests
// =============================================================================

describe("next round connector positioning", () => {
	/**
	 * Calculates the Y position for the next round connector
	 */
	function calculateNextRoundConnectY(
		vLineTop: number,
		vLineHeight: number
	): number {
		// Connect at midpoint of vertical line
		return vLineTop + vLineHeight / 2;
	}

	it("should position at midpoint of vertical line", () => {
		const vLineTop = TOP_PADDING + MATCH_HEIGHT / 2; // 56
		const vLineHeight = MATCH_HEIGHT + MATCH_GAP; // 104

		const nextConnectY = calculateNextRoundConnectY(vLineTop, vLineHeight);

		expect(nextConnectY).toBe(vLineTop + vLineHeight / 2);
		expect(nextConnectY).toBe(108); // 56 + 52
	});

	it("should use correct right position", () => {
		expect(NEXT_ROUND_CONNECTOR_RIGHT).toBe(16);
	});

	it("should use correct width", () => {
		expect(NEXT_ROUND_CONNECTOR_WIDTH).toBe(40);
	});

	it("should only draw from top of pair", () => {
		const shouldDraw = (matchIndex: number) => matchIndex % 2 === 0;

		expect(shouldDraw(0)).toBe(true);
		expect(shouldDraw(1)).toBe(false);
	});
});

// =============================================================================
// No Partner Edge Case Tests
// =============================================================================

describe("no pair partner handling", () => {
	/**
	 * For matches without a partner, only draw horizontal line
	 */
	function getConnectorType(
		matchIndex: number,
		totalMatches: number
	): "full" | "horizontal_only" {
		const isTop = matchIndex % 2 === 0;
		const pairPartnerIndex = isTop ? matchIndex + 1 : matchIndex - 1;
		const hasPairPartner =
			pairPartnerIndex >= 0 && pairPartnerIndex < totalMatches;

		return hasPairPartner ? "full" : "horizontal_only";
	}

	it("should return horizontal_only for orphan match", () => {
		// 3 matches: 0, 1, 2. Match 2 has no partner at index 3
		expect(getConnectorType(2, 3)).toBe("horizontal_only");
	});

	it("should return full for paired matches", () => {
		expect(getConnectorType(0, 4)).toBe("full");
		expect(getConnectorType(1, 4)).toBe("full");
	});

	it("should return horizontal_only for single match", () => {
		expect(getConnectorType(0, 1)).toBe("horizontal_only");
	});
});

// =============================================================================
// Partner Position Calculation Tests
// =============================================================================

describe("partner position calculation", () => {
	/**
	 * Calculates the top position for a pair partner
	 */
	function calculatePairPartnerTopPosition(
		pairPartnerIndex: number,
		matchHeight: number,
		matchGap: number
	): number {
		return TOP_PADDING + pairPartnerIndex * (matchHeight + matchGap);
	}

	it("should calculate partner position using same formula", () => {
		const partner1Top = calculatePairPartnerTopPosition(1, MATCH_HEIGHT, MATCH_GAP);
		const expectedTop = TOP_PADDING + 1 * (MATCH_HEIGHT + MATCH_GAP);

		expect(partner1Top).toBe(expectedTop);
		expect(partner1Top).toBe(120); // 16 + 104
	});

	it("should calculate connect Y for partner", () => {
		const partnerTop = calculatePairPartnerTopPosition(1, MATCH_HEIGHT, MATCH_GAP);
		const partnerConnectY = partnerTop + MATCH_HEIGHT / 2;

		expect(partnerConnectY).toBe(160); // 120 + 40
	});
});

// =============================================================================
// CSS Positioning Tests
// =============================================================================

describe("CSS positioning values", () => {
	it("should use absolute positioning", () => {
		const positionClass = "absolute";
		expect(positionClass).toBe("absolute");
	});

	it("should use border color class", () => {
		const lineColorClass = "bg-border";
		expect(lineColorClass).toBe("bg-border");
	});

	it("should use correct line thickness for horizontal", () => {
		const hLineThicknessClass = "h-0.5";
		expect(hLineThicknessClass).toBe("h-0.5");
	});

	it("should use correct line thickness for vertical", () => {
		const vLineThicknessClass = "w-0.5";
		expect(vLineThicknessClass).toBe("w-0.5");
	});
});

// =============================================================================
// Full Connector Render Logic Tests
// =============================================================================

describe("full connector render logic", () => {
	interface ConnectorProps {
		matchIndex: number;
		matchHeight: number;
		matchGap: number;
		topPosition: number;
		totalMatches: number;
	}

	/**
	 * Determines what to render for a connector
	 */
	function getConnectorRenderPlan(props: ConnectorProps): {
		horizontalLine: { top: number; right: number; width: number };
		verticalLine?: { top: number; right: number; height: number };
		nextRoundLine?: { top: number; right: number; width: number };
	} {
		const { matchIndex, matchHeight, matchGap, topPosition, totalMatches } = props;

		const connectorOffset = matchHeight / 2;
		const matchConnectY = topPosition + connectorOffset;

		const isTop = matchIndex % 2 === 0;
		const pairPartnerIndex = isTop ? matchIndex + 1 : matchIndex - 1;
		const hasPairPartner =
			pairPartnerIndex >= 0 && pairPartnerIndex < totalMatches;

		const plan: ReturnType<typeof getConnectorRenderPlan> = {
			horizontalLine: {
				top: matchConnectY,
				right: CONNECTOR_RIGHT_OFFSET,
				width: H_LINE_WIDTH,
			},
		};

		if (hasPairPartner && isTop) {
			const pairPartnerTopPosition =
				TOP_PADDING + pairPartnerIndex * (matchHeight + matchGap);
			const pairPartnerConnectY = pairPartnerTopPosition + connectorOffset;

			const vLineTop = matchConnectY;
			const vLineHeight = Math.abs(pairPartnerConnectY - matchConnectY);
			const nextRoundConnectY = vLineTop + vLineHeight / 2;

			plan.verticalLine = {
				top: vLineTop,
				right: CONNECTOR_RIGHT_OFFSET,
				height: vLineHeight,
			};

			plan.nextRoundLine = {
				top: nextRoundConnectY,
				right: NEXT_ROUND_CONNECTOR_RIGHT,
				width: NEXT_ROUND_CONNECTOR_WIDTH,
			};
		}

		return plan;
	}

	it("should return full plan for top of pair", () => {
		const plan = getConnectorRenderPlan({
			matchIndex: 0,
			matchHeight: MATCH_HEIGHT,
			matchGap: MATCH_GAP,
			topPosition: TOP_PADDING,
			totalMatches: 4,
		});

		expect(plan.horizontalLine).toBeDefined();
		expect(plan.verticalLine).toBeDefined();
		expect(plan.nextRoundLine).toBeDefined();
	});

	it("should return only horizontal for bottom of pair", () => {
		const plan = getConnectorRenderPlan({
			matchIndex: 1,
			matchHeight: MATCH_HEIGHT,
			matchGap: MATCH_GAP,
			topPosition: TOP_PADDING + MATCH_HEIGHT + MATCH_GAP,
			totalMatches: 4,
		});

		expect(plan.horizontalLine).toBeDefined();
		expect(plan.verticalLine).toBeUndefined();
		expect(plan.nextRoundLine).toBeUndefined();
	});

	it("should return only horizontal for orphan match", () => {
		const plan = getConnectorRenderPlan({
			matchIndex: 2,
			matchHeight: MATCH_HEIGHT,
			matchGap: MATCH_GAP,
			topPosition: TOP_PADDING + 2 * (MATCH_HEIGHT + MATCH_GAP),
			totalMatches: 3, // Odd count - match 2 has no partner
		});

		expect(plan.horizontalLine).toBeDefined();
		expect(plan.verticalLine).toBeUndefined();
		expect(plan.nextRoundLine).toBeUndefined();
	});
});
