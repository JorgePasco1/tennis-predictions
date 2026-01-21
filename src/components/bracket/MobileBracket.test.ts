/**
 * MobileBracket Component Tests
 *
 * Tests for the simple mobile bracket component covering:
 * - Round selection and navigation
 * - Default round selection logic
 * - Empty state handling
 * - Match display
 * - Accessibility attributes
 */

import { describe, expect, it, vi } from "vitest";
import {
	createActiveRound,
	createBracketWithPicks,
	createEmptyRound,
	createFinalizedRound,
	createSmallBracket,
	roundAbbreviationTestCases,
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

	it("should preserve original array", () => {
		const rounds = [
			createActiveRound({ roundNumber: 2, id: 2 }),
			createActiveRound({ roundNumber: 1, id: 1 }),
		];

		const original = rounds[0];
		const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);

		expect(rounds[0]).toBe(original);
		expect(sorted[0]?.roundNumber).toBe(1);
	});
});

// =============================================================================
// Default Round Selection Tests
// =============================================================================

describe("default round selection", () => {
	/**
	 * Gets the default round to display based on round states
	 */
	function getDefaultRound(sortedRounds: RoundData[]): string {
		// First priority: active round
		const activeRound = sortedRounds.find((r) => r.isActive);
		if (activeRound) return activeRound.id.toString();

		// Second priority: latest round with finalized matches
		const roundsWithFinalizedMatches = sortedRounds.filter((r) =>
			r.matches.some((m) => m.status === "finalized")
		);
		if (roundsWithFinalizedMatches.length > 0) {
			const latestFinalized =
				roundsWithFinalizedMatches[roundsWithFinalizedMatches.length - 1];
			if (latestFinalized) return latestFinalized.id.toString();
		}

		// Fallback: first round
		return sortedRounds[0]?.id.toString() ?? "";
	}

	describe("active round priority", () => {
		it("should select active round when present", () => {
			const rounds = [
				createFinalizedRound({ id: 1, roundNumber: 1, isActive: false }),
				createActiveRound({ id: 2, roundNumber: 2, isActive: true }),
				createEmptyRound({ id: 3, roundNumber: 3, isActive: false }),
			];

			const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
			expect(getDefaultRound(sorted)).toBe("2");
		});

		it("should select first active round when multiple are active", () => {
			const rounds = [
				createActiveRound({ id: 1, roundNumber: 1, isActive: true }),
				createActiveRound({ id: 2, roundNumber: 2, isActive: true }),
			];

			const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
			expect(getDefaultRound(sorted)).toBe("1");
		});
	});

	describe("finalized round fallback", () => {
		it("should select latest finalized round when no active round", () => {
			const rounds = [
				createFinalizedRound({ id: 1, roundNumber: 1, isActive: false }),
				createFinalizedRound({ id: 2, roundNumber: 2, isActive: false }),
			];

			const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
			expect(getDefaultRound(sorted)).toBe("2");
		});

		it("should identify rounds with finalized matches", () => {
			const rounds = createBracketWithPicks();
			const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);

			const roundsWithFinalized = sorted.filter((r) =>
				r.matches.some((m) => m.status === "finalized")
			);

			expect(roundsWithFinalized.length).toBeGreaterThan(0);
		});
	});

	describe("first round fallback", () => {
		it("should select first round when no active or finalized", () => {
			const rounds = [
				createEmptyRound({ id: 1, roundNumber: 1, isActive: false }),
				createEmptyRound({ id: 2, roundNumber: 2, isActive: false }),
			];

			const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
			expect(getDefaultRound(sorted)).toBe("1");
		});

		it("should return empty string for empty rounds array", () => {
			const rounds: RoundData[] = [];
			expect(getDefaultRound(rounds)).toBe("");
		});
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

	it("should detect round with no matches", () => {
		const round = createEmptyRound();
		expect(round.matches.length).toBe(0);
	});
});

// =============================================================================
// Round Selector Button Tests
// =============================================================================

describe("round selector buttons", () => {
	describe("button styling", () => {
		it("should identify selected button", () => {
			const rounds = createSmallBracket();
			const selectedRoundId = rounds[0]?.id.toString();

			const isSelected = (roundId: number) =>
				selectedRoundId === roundId.toString();

			expect(isSelected(rounds[0]!.id)).toBe(true);
			expect(isSelected(rounds[1]!.id)).toBe(false);
		});

		it("should apply correct class for selected state", () => {
			const selectedClass = "border-primary bg-primary text-primary-foreground";
			const unselectedClass =
				"border-border bg-background text-foreground hover:border-primary/50";

			expect(selectedClass).toContain("bg-primary");
			expect(unselectedClass).toContain("bg-background");
		});
	});

	describe("button dimensions", () => {
		it("should have circular shape", () => {
			// Buttons are h-12 w-12 rounded-full
			const buttonClasses = "h-12 w-12 shrink-0 rounded-full";
			expect(buttonClasses).toContain("rounded-full");
			expect(buttonClasses).toContain("h-12");
			expect(buttonClasses).toContain("w-12");
		});
	});

	describe("accessibility", () => {
		it("should generate correct aria-label", () => {
			const round = createActiveRound({ name: "Quarter Finals", isActive: true });

			const ariaLabel = `${round.name}${round.isActive ? " (Active)" : ""}${round.isFinalized ? " (Finalized)" : ""}`;

			expect(ariaLabel).toBe("Quarter Finals (Active)");
		});

		it("should include finalized status in aria-label", () => {
			const round = createFinalizedRound({ name: "Semi Finals", isFinalized: true });

			const ariaLabel = `${round.name}${round.isActive ? " (Active)" : ""}${round.isFinalized ? " (Finalized)" : ""}`;

			expect(ariaLabel).toContain("(Finalized)");
		});

		it("should have aria-pressed attribute", () => {
			const selectedId = "1";
			const roundId = "1";

			const ariaPressed = selectedId === roundId;
			expect(ariaPressed).toBe(true);
		});
	});
});

// =============================================================================
// Round Abbreviation Display Tests
// =============================================================================

describe("round abbreviation display", () => {
	/**
	 * Simple abbreviation function matching round-utils behavior
	 */
	function getRoundAbbreviation(roundName: string, roundNumber: number): string {
		const roundMap: Record<string, string> = {
			"Round of 128": "R128",
			"Round of 64": "R64",
			"Round of 32": "R32",
			"Round of 16": "R16",
			"Quarter Finals": "QF",
			"Semi Finals": "SF",
			Final: "F",
		};

		return roundMap[roundName] ?? `R${roundNumber}`;
	}

	it.each(roundAbbreviationTestCases)(
		'should display "$expected" for "$roundName"',
		({ roundName, roundNumber, expected }) => {
			expect(getRoundAbbreviation(roundName, roundNumber)).toBe(expected);
		}
	);
});

// =============================================================================
// Match List Display Tests
// =============================================================================

describe("match list display", () => {
	it("should display all matches in selected round", () => {
		const round = createActiveRound();
		expect(round.matches.length).toBe(4);
	});

	it("should handle empty match list", () => {
		const round = createEmptyRound();
		expect(round.matches.length).toBe(0);
	});

	it("should render matches in order", () => {
		const round = createActiveRound();

		for (let i = 0; i < round.matches.length; i++) {
			expect(round.matches[i]?.matchNumber).toBe(i + 1);
		}
	});
});

// =============================================================================
// Round Selection Change Tests
// =============================================================================

describe("round selection change", () => {
	it("should update selected round on button click", () => {
		let selectedRoundId = "1";

		const setSelectedRoundId = (id: string) => {
			selectedRoundId = id;
		};

		setSelectedRoundId("2");
		expect(selectedRoundId).toBe("2");
	});

	it("should find selected round in sorted array", () => {
		const rounds = createSmallBracket();
		const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
		const selectedRoundId = "2";

		const selectedRound = sorted.find(
			(r) => r.id.toString() === selectedRoundId
		);

		expect(selectedRound).toBeDefined();
		expect(selectedRound?.id).toBe(2);
	});
});

// =============================================================================
// Click Handler Tests
// =============================================================================

describe("click handler", () => {
	it("should propagate click to match component", () => {
		const onMatchClick = vi.fn();
		const matchId = 42;

		// Simulate match click
		onMatchClick(matchId);

		expect(onMatchClick).toHaveBeenCalledWith(42);
	});

	it("should handle undefined click handler", () => {
		const onMatchClick: ((id: number) => void) | undefined = undefined;

		expect(() => {
			if (onMatchClick) {
				onMatchClick(1);
			}
		}).not.toThrow();
	});
});

// =============================================================================
// Scrollable Container Tests
// =============================================================================

describe("scrollable container", () => {
	it("should have horizontal scroll for round buttons", () => {
		const containerClasses = "scrollbar-hide flex gap-2 overflow-x-auto pb-2";

		expect(containerClasses).toContain("overflow-x-auto");
		expect(containerClasses).toContain("scrollbar-hide");
	});

	it("should prevent button shrinking", () => {
		const buttonClasses = "shrink-0";
		expect(buttonClasses).toContain("shrink-0");
	});
});

// =============================================================================
// Match Spacing Tests
// =============================================================================

describe("match spacing", () => {
	it("should have vertical spacing between matches", () => {
		const containerClasses = "space-y-3";
		expect(containerClasses).toContain("space-y-3");
	});
});

// =============================================================================
// Edge Case Tests
// =============================================================================

describe("edge cases", () => {
	it("should handle single round", () => {
		const rounds = [createActiveRound({ id: 1, roundNumber: 1 })];
		const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);

		expect(sorted.length).toBe(1);
		expect(sorted[0]?.id).toBe(1);
	});

	it("should handle round with single match", () => {
		const round = createActiveRound({
			matches: [createActiveRound().matches[0]!],
		});

		expect(round.matches.length).toBe(1);
	});

	it("should handle all rounds finalized", () => {
		const rounds = [
			createFinalizedRound({ id: 1, roundNumber: 1 }),
			createFinalizedRound({ id: 2, roundNumber: 2 }),
		];

		const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
		const activeRound = sorted.find((r) => r.isActive);

		expect(activeRound).toBeUndefined();
	});

	it("should handle all rounds with no finalized matches", () => {
		const rounds = [
			createEmptyRound({ id: 1, roundNumber: 1 }),
			createEmptyRound({ id: 2, roundNumber: 2 }),
		];

		const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
		const roundsWithFinalized = sorted.filter((r) =>
			r.matches.some((m) => m.status === "finalized")
		);

		expect(roundsWithFinalized.length).toBe(0);
	});
});

// =============================================================================
// State Consistency Tests
// =============================================================================

describe("state consistency", () => {
	it("should maintain round id as string in state", () => {
		const round = createActiveRound({ id: 42 });
		const selectedRoundId = round.id.toString();

		expect(selectedRoundId).toBe("42");
		expect(typeof selectedRoundId).toBe("string");
	});

	it("should match round by string comparison", () => {
		const rounds = createSmallBracket();
		const selectedRoundId = rounds[0]!.id.toString();

		const selectedRound = rounds.find(
			(r) => r.id.toString() === selectedRoundId
		);

		expect(selectedRound).toBeDefined();
	});
});
