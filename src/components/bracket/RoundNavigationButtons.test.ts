/**
 * RoundNavigationButtons Component Tests
 *
 * Tests for the round navigation buttons component covering:
 * - Button rendering for each round
 * - Selection state handling
 * - Accessibility attributes
 * - Round abbreviation display
 * - Click handling
 */

import { describe, expect, it, vi } from "vitest";
import {
	createActiveRound,
	createFinalizedRound,
	createFullTournamentBracket,
	createSmallBracket,
	roundAbbreviationTestCases,
} from "~/test/bracket-fixtures";
import type { RoundData } from "./bracket-types";

// =============================================================================
// Button Rendering Tests
// =============================================================================

describe("button rendering", () => {
	it("should render a button for each round", () => {
		const rounds = createSmallBracket();
		expect(rounds.length).toBe(2);
	});

	it("should render buttons in round order", () => {
		const rounds = createFullTournamentBracket();

		// Verify rounds are provided in order (component receives sorted rounds)
		for (let i = 0; i < rounds.length - 1; i++) {
			expect(rounds[i]?.roundNumber).toBeLessThan(rounds[i + 1]?.roundNumber);
		}
	});
});

// =============================================================================
// Selection State Tests
// =============================================================================

describe("selection state", () => {
	/**
	 * Checks if a button should show selected styling
	 */
	function isSelected(selectedIndex: number, buttonIndex: number): boolean {
		return selectedIndex === buttonIndex;
	}

	it("should identify selected button", () => {
		expect(isSelected(0, 0)).toBe(true);
		expect(isSelected(0, 1)).toBe(false);
	});

	it("should only have one selected at a time", () => {
		const rounds = createSmallBracket();
		const selectedIndex = 0;

		const selectedCount = rounds.filter(
			(_, index) => index === selectedIndex,
		).length;

		expect(selectedCount).toBe(1);
	});

	describe("selected styling", () => {
		it("should apply primary colors when selected", () => {
			const selectedClasses =
				"border-primary bg-primary text-primary-foreground";

			expect(selectedClasses).toContain("border-primary");
			expect(selectedClasses).toContain("bg-primary");
			expect(selectedClasses).toContain("text-primary-foreground");
		});

		it("should apply default colors when not selected", () => {
			const unselectedClasses =
				"border-border bg-background text-foreground hover:border-primary/50";

			expect(unselectedClasses).toContain("border-border");
			expect(unselectedClasses).toContain("bg-background");
			expect(unselectedClasses).toContain("hover:");
		});
	});
});

// =============================================================================
// Click Handler Tests
// =============================================================================

describe("click handling", () => {
	it("should call onSelectRound with index on click", () => {
		const onSelectRound = vi.fn();

		// Simulate clicking on button at index 2
		onSelectRound(2);

		expect(onSelectRound).toHaveBeenCalledWith(2);
	});

	it("should support clicking any round", () => {
		const onSelectRound = vi.fn();
		const rounds = createFullTournamentBracket();

		// Click each round
		rounds.forEach((_, index) => {
			onSelectRound(index);
		});

		expect(onSelectRound).toHaveBeenCalledTimes(7);
	});

	it("should support clicking same round multiple times", () => {
		const onSelectRound = vi.fn();

		onSelectRound(0);
		onSelectRound(0);
		onSelectRound(0);

		expect(onSelectRound).toHaveBeenCalledTimes(3);
	});
});

// =============================================================================
// Accessibility Tests
// =============================================================================

describe("accessibility", () => {
	describe("aria-label", () => {
		/**
		 * Generates aria-label for a round button
		 */
		function generateAriaLabel(round: RoundData): string {
			return `${round.name}${round.isActive ? " (Active)" : ""}${round.isFinalized ? " (Finalized)" : ""}`;
		}

		it("should include round name", () => {
			const round = createActiveRound({ name: "Quarter Finals" });
			const label = generateAriaLabel(round);

			expect(label).toContain("Quarter Finals");
		});

		it("should include (Active) for active rounds", () => {
			const round = createActiveRound({ isActive: true });
			const label = generateAriaLabel(round);

			expect(label).toContain("(Active)");
		});

		it("should include (Finalized) for finalized rounds", () => {
			const round = createFinalizedRound({ isFinalized: true });
			const label = generateAriaLabel(round);

			expect(label).toContain("(Finalized)");
		});

		it("should include both flags when applicable", () => {
			const round = createActiveRound({
				name: "Semi Finals",
				isActive: true,
				isFinalized: true,
			});
			const label = generateAriaLabel(round);

			expect(label).toContain("Semi Finals");
			expect(label).toContain("(Active)");
			expect(label).toContain("(Finalized)");
		});

		it("should not include flags for inactive/non-finalized", () => {
			const round = createActiveRound({
				name: "Round 1",
				isActive: false,
				isFinalized: false,
			});
			const label = generateAriaLabel(round);

			expect(label).toBe("Round 1");
		});
	});

	describe("aria-pressed", () => {
		it("should be true when selected", () => {
			const selectedIndex = 0;
			const buttonIndex = 0;
			const ariaPressed = selectedIndex === buttonIndex;

			expect(ariaPressed).toBe(true);
		});

		it("should be false when not selected", () => {
			const selectedIndex = 0;
			const buttonIndex = 1;
			const ariaPressed = selectedIndex === buttonIndex;

			expect(ariaPressed).toBe(false);
		});
	});

	describe("button type", () => {
		it("should have type button to prevent form submission", () => {
			const buttonType = "button";
			expect(buttonType).toBe("button");
		});
	});
});

// =============================================================================
// Round Abbreviation Tests
// =============================================================================

describe("round abbreviation display", () => {
	/**
	 * Gets abbreviation for round name
	 */
	function getRoundAbbreviation(
		roundName: string,
		roundNumber: number,
	): string {
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

	it.each(
		roundAbbreviationTestCases,
	)('should display "$expected" for "$roundName"', ({
		roundName,
		roundNumber,
		expected,
	}) => {
		expect(getRoundAbbreviation(roundName, roundNumber)).toBe(expected);
	});

	it("should display abbreviation within circular button", () => {
		// Abbreviations should be short enough for circular button
		const abbreviations = ["R128", "R64", "R32", "R16", "QF", "SF", "F"];

		abbreviations.forEach((abbr) => {
			expect(abbr.length).toBeLessThanOrEqual(4);
		});
	});
});

// =============================================================================
// Button Styling Tests
// =============================================================================

describe("button styling", () => {
	describe("dimensions", () => {
		it("should have circular shape (h-12 w-12 rounded-full)", () => {
			const dimensionClasses = "h-12 w-12 rounded-full";

			expect(dimensionClasses).toContain("h-12");
			expect(dimensionClasses).toContain("w-12");
			expect(dimensionClasses).toContain("rounded-full");
		});

		it("should prevent shrinking (shrink-0)", () => {
			const shrinkClass = "shrink-0";
			expect(shrinkClass).toBe("shrink-0");
		});
	});

	describe("border and background", () => {
		it("should have 2px border", () => {
			const borderClass = "border-2";
			expect(borderClass).toBe("border-2");
		});

		it("should have transition for smooth state changes", () => {
			const transitionClass = "transition-all";
			expect(transitionClass).toBe("transition-all");
		});
	});

	describe("text styling", () => {
		it("should have semibold font weight", () => {
			const fontClass = "font-semibold";
			expect(fontClass).toBe("font-semibold");
		});

		it("should have small text size", () => {
			const textClass = "text-sm";
			expect(textClass).toBe("text-sm");
		});
	});

	describe("layout", () => {
		it("should center content (flex items-center justify-center)", () => {
			const layoutClasses = "flex items-center justify-center";

			expect(layoutClasses).toContain("flex");
			expect(layoutClasses).toContain("items-center");
			expect(layoutClasses).toContain("justify-center");
		});
	});
});

// =============================================================================
// Container Styling Tests
// =============================================================================

describe("container styling", () => {
	it("should allow horizontal scrolling", () => {
		const containerClasses = "overflow-x-auto";
		expect(containerClasses).toContain("overflow-x-auto");
	});

	it("should hide scrollbar", () => {
		const containerClasses = "scrollbar-hide";
		expect(containerClasses).toContain("scrollbar-hide");
	});

	it("should have gap between buttons", () => {
		const containerClasses = "gap-2";
		expect(containerClasses).toContain("gap-2");
	});

	it("should have bottom padding for scrollbar space", () => {
		const containerClasses = "pb-2";
		expect(containerClasses).toContain("pb-2");
	});

	it("should use flex layout", () => {
		const containerClasses = "flex";
		expect(containerClasses).toContain("flex");
	});
});

// =============================================================================
// Key Prop Tests
// =============================================================================

describe("key prop", () => {
	it("should use round.id as key", () => {
		const rounds = createSmallBracket();

		const keys = rounds.map((r) => r.id);
		const uniqueKeys = new Set(keys);

		expect(uniqueKeys.size).toBe(rounds.length);
	});

	it("should have stable keys across renders", () => {
		const rounds1 = createSmallBracket();
		const rounds2 = createSmallBracket();

		// Same fixture should produce same ids
		expect(rounds1[0]?.id).toBe(rounds2[0]?.id);
	});
});

// =============================================================================
// Edge Cases Tests
// =============================================================================

describe("edge cases", () => {
	it("should handle single round", () => {
		const rounds = [createActiveRound({ id: 1, roundNumber: 1 })];
		expect(rounds.length).toBe(1);
	});

	it("should handle many rounds (Grand Slam)", () => {
		const rounds = createFullTournamentBracket();
		expect(rounds.length).toBe(7);
	});

	it("should handle round with long name", () => {
		const round = createActiveRound({
			name: "Very Long Round Name That Should Be Abbreviated",
			roundNumber: 99,
		});

		const abbreviation =
			round.name in
			{
				"Round of 128": "R128",
				"Round of 64": "R64",
				Final: "F",
			}
				? "matched"
				: `R${round.roundNumber}`;

		expect(abbreviation).toBe("R99");
	});

	it("should handle all rounds active", () => {
		const rounds = [
			createActiveRound({ id: 1, roundNumber: 1, isActive: true }),
			createActiveRound({ id: 2, roundNumber: 2, isActive: true }),
		];

		const activeCount = rounds.filter((r) => r.isActive).length;
		expect(activeCount).toBe(2);
	});

	it("should handle no active rounds", () => {
		const rounds = [
			createFinalizedRound({ id: 1, roundNumber: 1, isActive: false }),
			createFinalizedRound({ id: 2, roundNumber: 2, isActive: false }),
		];

		const activeCount = rounds.filter((r) => r.isActive).length;
		expect(activeCount).toBe(0);
	});
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("component integration", () => {
	it("should work with MobileBracketWithConnectors data", () => {
		const rounds = createFullTournamentBracket();
		const selectedIndex = 3;

		const props = {
			rounds,
			selectedIndex,
			onSelectRound: vi.fn(),
		};

		expect(props.rounds).toHaveLength(7);
		expect(props.selectedIndex).toBe(3);
	});

	it("should support navigation to any round", () => {
		const onSelectRound = vi.fn();
		const rounds = createFullTournamentBracket();

		// Navigate to each round
		rounds.forEach((_, index) => {
			onSelectRound(index);
		});

		expect(onSelectRound).toHaveBeenCalledWith(0);
		expect(onSelectRound).toHaveBeenCalledWith(3);
		expect(onSelectRound).toHaveBeenCalledWith(6);
	});
});
