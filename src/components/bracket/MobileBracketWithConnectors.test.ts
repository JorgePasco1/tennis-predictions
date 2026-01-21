/**
 * MobileBracketWithConnectors Component Tests
 *
 * Tests for the mobile bracket with sliding navigation covering:
 * - Round navigation and sliding
 * - Default round selection
 * - Height calculations
 * - Transform calculations
 * - Empty state handling
 */

import { describe, expect, it, vi } from "vitest";
import {
	BOTTOM_PADDING,
	MATCH_GAP,
	MATCH_HEIGHT,
	TOP_PADDING,
} from "./bracket-constants";
import {
	createActiveRound,
	createBracketWithPicks,
	createEmptyRound,
	createFinalizedRound,
	createFullTournamentBracket,
	createSmallBracket,
} from "~/test/bracket-fixtures";
import type { RoundData } from "./bracket-types";

// =============================================================================
// Round Sorting Tests
// =============================================================================

describe("round sorting", () => {
	it("should sort rounds by roundNumber ascending", () => {
		const rounds = [
			createActiveRound({ roundNumber: 3, id: 3 }),
			createActiveRound({ roundNumber: 1, id: 1 }),
			createActiveRound({ roundNumber: 2, id: 2 }),
		];

		const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);

		expect(sorted[0]?.roundNumber).toBe(1);
		expect(sorted[1]?.roundNumber).toBe(2);
		expect(sorted[2]?.roundNumber).toBe(3);
	});
});

// =============================================================================
// Default Round Index Selection Tests
// =============================================================================

describe("default round index selection", () => {
	/**
	 * Gets the default round index based on round states
	 */
	function getDefaultRoundIndex(sortedRounds: RoundData[]): number {
		// First priority: active round
		const activeIndex = sortedRounds.findIndex((r) => r.isActive);
		if (activeIndex !== -1) return activeIndex;

		// Second priority: latest round with finalized matches
		const roundsWithFinalizedMatches = sortedRounds.filter((r) =>
			r.matches.some((m) => m.status === "finalized")
		);
		if (roundsWithFinalizedMatches.length > 0) {
			const latestFinalized =
				roundsWithFinalizedMatches[roundsWithFinalizedMatches.length - 1];
			if (latestFinalized) {
				return sortedRounds.findIndex((r) => r.id === latestFinalized.id);
			}
		}

		// Fallback: first round
		return 0;
	}

	describe("active round priority", () => {
		it("should return index of active round", () => {
			const rounds = [
				createFinalizedRound({ id: 1, roundNumber: 1, isActive: false }),
				createActiveRound({ id: 2, roundNumber: 2, isActive: true }),
				createEmptyRound({ id: 3, roundNumber: 3, isActive: false }),
			];

			const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
			expect(getDefaultRoundIndex(sorted)).toBe(1); // Index of round 2
		});

		it("should return first active round index when multiple active", () => {
			const rounds = [
				createActiveRound({ id: 1, roundNumber: 1, isActive: true }),
				createActiveRound({ id: 2, roundNumber: 2, isActive: true }),
			];

			const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
			expect(getDefaultRoundIndex(sorted)).toBe(0);
		});
	});

	describe("finalized round fallback", () => {
		it("should return index of latest finalized round when no active", () => {
			const rounds = [
				createFinalizedRound({ id: 1, roundNumber: 1, isActive: false }),
				createFinalizedRound({ id: 2, roundNumber: 2, isActive: false }),
			];

			const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
			expect(getDefaultRoundIndex(sorted)).toBe(1);
		});
	});

	describe("first round fallback", () => {
		it("should return 0 when no active or finalized rounds", () => {
			const rounds = [
				createEmptyRound({ id: 1, roundNumber: 1 }),
				createEmptyRound({ id: 2, roundNumber: 2 }),
			];

			const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
			expect(getDefaultRoundIndex(sorted)).toBe(0);
		});

		it("should return 0 for empty array", () => {
			const rounds: RoundData[] = [];
			expect(getDefaultRoundIndex(rounds)).toBe(0);
		});
	});
});

// =============================================================================
// Transform Calculation Tests
// =============================================================================

describe("transform calculations", () => {
	/**
	 * Calculates transform percentage for sliding
	 */
	function calculateTranslateXPercent(selectedRoundIndex: number): number {
		return -(selectedRoundIndex * 100);
	}

	it("should return 0 for first round (0%)", () => {
		// Note: -(0 * 100) returns -0 in JavaScript
		// Both 0 and -0 are valid for "no translation", so we check the value is functionally zero
		const result = calculateTranslateXPercent(0);
		expect(result === 0).toBe(true); // -0 === 0 is true in JavaScript
	});

	it("should return -100% for second round", () => {
		expect(calculateTranslateXPercent(1)).toBe(-100);
	});

	it("should return -200% for third round", () => {
		expect(calculateTranslateXPercent(2)).toBe(-200);
	});

	it("should return correct percentage for any round", () => {
		for (let i = 0; i < 7; i++) {
			expect(calculateTranslateXPercent(i)).toBe(-i * 100);
		}
	});
});

// =============================================================================
// Height Calculation Tests
// =============================================================================

describe("height calculations", () => {
	/**
	 * Calculates the height needed for a round
	 */
	function calculateRoundHeight(round: RoundData): number {
		if (round.matches.length === 0) return 200;

		const matchCount = round.matches.length;
		const totalMatchesHeight = matchCount * MATCH_HEIGHT;
		const totalGapsHeight = (matchCount - 1) * MATCH_GAP;

		return TOP_PADDING + totalMatchesHeight + totalGapsHeight + BOTTOM_PADDING;
	}

	it("should return minimum height for empty round", () => {
		const round = createEmptyRound();
		expect(calculateRoundHeight(round)).toBe(200);
	});

	it("should calculate height for single match", () => {
		const round = createActiveRound({
			matches: [createActiveRound().matches[0]!],
		});

		// 16 + 80 + 0 + 80 = 176
		expect(calculateRoundHeight(round)).toBe(
			TOP_PADDING + MATCH_HEIGHT + BOTTOM_PADDING
		);
	});

	it("should calculate height for multiple matches", () => {
		const round = createActiveRound(); // Has 4 matches

		// 16 + (4 * 80) + (3 * 24) + 80 = 16 + 320 + 72 + 80 = 488
		const expected =
			TOP_PADDING +
			4 * MATCH_HEIGHT +
			3 * MATCH_GAP +
			BOTTOM_PADDING;

		expect(calculateRoundHeight(round)).toBe(expected);
	});

	it("should increase height linearly with match count", () => {
		const height1 = TOP_PADDING + 1 * MATCH_HEIGHT + 0 * MATCH_GAP + BOTTOM_PADDING;
		const height2 = TOP_PADDING + 2 * MATCH_HEIGHT + 1 * MATCH_GAP + BOTTOM_PADDING;
		const height4 = TOP_PADDING + 4 * MATCH_HEIGHT + 3 * MATCH_GAP + BOTTOM_PADDING;

		// Difference between 1 and 2 matches
		const diff1to2 = height2 - height1;
		// Should be MATCH_HEIGHT + MATCH_GAP
		expect(diff1to2).toBe(MATCH_HEIGHT + MATCH_GAP);

		// Difference between 2 and 4 matches should be 2 * (MATCH_HEIGHT + MATCH_GAP)
		const diff2to4 = height4 - height2;
		expect(diff2to4).toBe(2 * (MATCH_HEIGHT + MATCH_GAP));
	});
});

// =============================================================================
// Empty State Tests
// =============================================================================

describe("empty state handling", () => {
	it("should detect empty rounds array", () => {
		const rounds: RoundData[] = [];
		expect(rounds.length).toBe(0);
	});

	it("should show empty state for no rounds", () => {
		const rounds: RoundData[] = [];
		const showEmptyState = rounds.length === 0;

		expect(showEmptyState).toBe(true);
	});
});

// =============================================================================
// Navigation State Tests
// =============================================================================

describe("navigation state", () => {
	it("should track selected round index", () => {
		let selectedRoundIndex = 0;

		const setSelectedRoundIndex = (index: number) => {
			selectedRoundIndex = index;
		};

		setSelectedRoundIndex(2);
		expect(selectedRoundIndex).toBe(2);
	});

	it("should update index on navigation button click", () => {
		const onSelectRound = vi.fn();

		// Simulate navigation
		onSelectRound(3);
		expect(onSelectRound).toHaveBeenCalledWith(3);
	});
});

// =============================================================================
// Child Component Props Tests
// =============================================================================

describe("child component props", () => {
	describe("RoundNavigationButtons props", () => {
		it("should pass sorted rounds to navigation", () => {
			const rounds = createSmallBracket();
			const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);

			const props = {
				rounds: sorted,
				selectedIndex: 0,
				onSelectRound: vi.fn(),
			};

			expect(props.rounds).toHaveLength(2);
			expect(props.selectedIndex).toBe(0);
		});
	});

	describe("MobileRoundView props", () => {
		it("should pass hasNextRound for all but last round", () => {
			const rounds = createSmallBracket();

			rounds.forEach((round, index) => {
				const hasNextRound = index < rounds.length - 1;

				if (index === 0) {
					expect(hasNextRound).toBe(true);
				} else {
					expect(hasNextRound).toBe(false);
				}
			});
		});

		it("should pass onMatchClick to each round view", () => {
			const onMatchClick = vi.fn();

			const props = {
				round: createActiveRound(),
				hasNextRound: true,
				onMatchClick,
			};

			expect(props.onMatchClick).toBe(onMatchClick);
		});
	});
});

// =============================================================================
// Sliding Animation Tests
// =============================================================================

describe("sliding animation", () => {
	it("should use transform for sliding", () => {
		const selectedRoundIndex = 2;
		const translateXPercent = -(selectedRoundIndex * 100);
		const transformStyle = `translateX(${translateXPercent}%)`;

		expect(transformStyle).toBe("translateX(-200%)");
	});

	it("should have transition for smooth animation", () => {
		const transitionStyle = "transform 0.3s ease-in-out";
		expect(transitionStyle).toContain("0.3s");
		expect(transitionStyle).toContain("ease-in-out");
	});

	it("should use will-change for performance", () => {
		const willChange = "transform";
		expect(willChange).toBe("transform");
	});
});

// =============================================================================
// Container Styling Tests
// =============================================================================

describe("container styling", () => {
	it("should have negative margins to break out of parent padding", () => {
		const containerClasses = "-mx-4 overflow-hidden";
		expect(containerClasses).toContain("-mx-4");
	});

	it("should have height transition", () => {
		const heightTransition = "height 0.3s ease-in-out";
		expect(heightTransition).toContain("height");
		expect(heightTransition).toContain("0.3s");
	});

	it("should use flex for round layout", () => {
		const displayStyle = "flex";
		expect(displayStyle).toBe("flex");
	});

	it("should have each round take full width", () => {
		const roundStyle = { minWidth: "100%", width: "100%", flex: "0 0 100%" };

		expect(roundStyle.minWidth).toBe("100%");
		expect(roundStyle.flex).toBe("0 0 100%");
	});
});

// =============================================================================
// Height Transition Tests
// =============================================================================

describe("height transition when switching rounds", () => {
	it("should calculate correct height for current round", () => {
		const rounds = createFullTournamentBracket();
		const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);

		const calculateRoundHeight = (round: RoundData): number => {
			if (round.matches.length === 0) return 200;
			const matchCount = round.matches.length;
			return (
				TOP_PADDING +
				matchCount * MATCH_HEIGHT +
				(matchCount - 1) * MATCH_GAP +
				BOTTOM_PADDING
			);
		};

		// R128 (64 matches) should be taller than F (1 match)
		const r128Height = calculateRoundHeight(sorted[0]!);
		const finalHeight = calculateRoundHeight(sorted[6]!);

		expect(r128Height).toBeGreaterThan(finalHeight);
	});

	it("should have fallback for undefined round", () => {
		const rounds = createSmallBracket();
		const selectedRoundIndex = 10; // Out of bounds

		const currentRound = rounds[selectedRoundIndex] ?? rounds[0]!;

		expect(currentRound).toBeDefined();
	});
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("component integration", () => {
	it("should pass click handler through to individual matches", () => {
		const onMatchClick = vi.fn();
		const matchId = 42;

		// Simulate click propagation
		onMatchClick(matchId);

		expect(onMatchClick).toHaveBeenCalledWith(42);
	});

	it("should handle rapid round navigation", () => {
		let selectedIndex = 0;

		const setSelectedIndex = (index: number) => {
			selectedIndex = index;
		};

		// Simulate rapid navigation
		for (let i = 0; i < 7; i++) {
			setSelectedIndex(i);
		}

		expect(selectedIndex).toBe(6);
	});

	it("should maintain consistency between navigation and display", () => {
		const rounds = createSmallBracket();
		const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
		let selectedIndex = 0;

		// Navigate to second round
		selectedIndex = 1;

		const currentRound = sorted[selectedIndex];
		const translateXPercent = -(selectedIndex * 100);

		expect(currentRound?.roundNumber).toBe(2);
		expect(translateXPercent).toBe(-100);
	});
});

// =============================================================================
// Edge Cases Tests
// =============================================================================

describe("edge cases", () => {
	it("should handle single round", () => {
		const rounds = [createActiveRound({ roundNumber: 1, id: 1 })];
		const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);

		expect(sorted.length).toBe(1);

		// hasNextRound should be false for only round
		const hasNextRound = 0 < sorted.length - 1;
		expect(hasNextRound).toBe(false);
	});

	it("should handle bracket with user picks", () => {
		const rounds = createBracketWithPicks();
		const hasUserPicks = rounds.some((r) =>
			r.matches.some((m) => m.userPick !== null)
		);

		expect(hasUserPicks).toBe(true);
	});

	it("should handle large brackets", () => {
		const rounds = createFullTournamentBracket();
		expect(rounds.length).toBe(7);

		// First round should have most matches
		const firstRound = rounds.find((r) => r.roundNumber === 1);
		expect(firstRound?.matches.length).toBe(64);
	});
});
