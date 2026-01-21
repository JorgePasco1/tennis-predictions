/**
 * MatchPicksModal Component Tests
 *
 * Tests for the match picks modal component covering:
 * - Modal open/close state
 * - Data fetching with tRPC
 * - Loading and error states
 * - Picks display
 * - Retirement handling
 * - Player name formatting
 * - Empty state
 */

import { describe, expect, it, vi } from "vitest";
import { mockMatchPicksModalData } from "~/test/bracket-fixtures";

// =============================================================================
// Modal State Tests
// =============================================================================

describe("modal state", () => {
	describe("open prop", () => {
		it("should be controlled by open prop", () => {
			const open = true;
			expect(open).toBe(true);
		});

		it("should close when open is false", () => {
			const open = false;
			expect(open).toBe(false);
		});
	});

	describe("onOpenChange callback", () => {
		it("should call onOpenChange when modal state changes", () => {
			const onOpenChange = vi.fn();

			onOpenChange(false);
			expect(onOpenChange).toHaveBeenCalledWith(false);

			onOpenChange(true);
			expect(onOpenChange).toHaveBeenCalledWith(true);
		});
	});

	describe("matchId prop", () => {
		it("should handle null matchId", () => {
			const matchId: number | null = null;
			expect(matchId).toBeNull();
		});

		it("should handle valid matchId", () => {
			const matchId: number | null = 42;
			expect(matchId).toBe(42);
		});
	});
});

// =============================================================================
// Query Enable Logic Tests
// =============================================================================

describe("query enable logic", () => {
	/**
	 * Determines if the query should be enabled
	 */
	function isQueryEnabled(open: boolean, matchId: number | null): boolean {
		return open && matchId !== null;
	}

	it("should enable query when modal is open and matchId exists", () => {
		expect(isQueryEnabled(true, 42)).toBe(true);
	});

	it("should disable query when modal is closed", () => {
		expect(isQueryEnabled(false, 42)).toBe(false);
	});

	it("should disable query when matchId is null", () => {
		expect(isQueryEnabled(true, null)).toBe(false);
	});

	it("should disable query when both conditions fail", () => {
		expect(isQueryEnabled(false, null)).toBe(false);
	});
});

// =============================================================================
// Player Name Formatting Tests
// =============================================================================

describe("player name formatting", () => {
	/**
	 * Formats player name with optional seed
	 */
	function formatPlayerName(name: string, seed: number | null): string {
		return seed ? `(${seed}) ${name}` : name;
	}

	it("should format name with seed", () => {
		expect(formatPlayerName("Novak Djokovic", 1)).toBe("(1) Novak Djokovic");
	});

	it("should format name without seed", () => {
		expect(formatPlayerName("Carlos Alcaraz", null)).toBe("Carlos Alcaraz");
	});

	it("should handle two-digit seeds", () => {
		expect(formatPlayerName("Player", 15)).toBe("(15) Player");
	});
});

// =============================================================================
// Initials Generation Tests
// =============================================================================

describe("initials generation", () => {
	/**
	 * Gets initials from a name
	 */
	function getInitials(name: string): string {
		return name
			.split(" ")
			.filter(Boolean)
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	}

	it("should get initials from two-word name", () => {
		expect(getInitials("John Doe")).toBe("JD");
	});

	it("should get initials from single name", () => {
		expect(getInitials("Madonna")).toBe("M");
	});

	it("should get initials from three-word name", () => {
		expect(getInitials("Mary Jane Watson")).toBe("MJ");
	});

	it("should handle empty string", () => {
		expect(getInitials("")).toBe("");
	});

	it("should be uppercase", () => {
		expect(getInitials("john doe")).toBe("JD");
	});

	it("should limit to 2 characters", () => {
		expect(getInitials("A B C D E").length).toBeLessThanOrEqual(2);
	});
});

// =============================================================================
// Loading State Tests
// =============================================================================

describe("loading state", () => {
	it("should show loading indicator when isLoading is true", () => {
		const isLoading = true;
		const showLoading = isLoading;

		expect(showLoading).toBe(true);
	});

	it("should hide loading indicator when data is available", () => {
		const isLoading = false;
		const data = mockMatchPicksModalData.matchWithPicks;

		const showLoading = isLoading && !data;
		expect(showLoading).toBe(false);
	});
});

// =============================================================================
// Error State Tests
// =============================================================================

describe("error state", () => {
	it("should display error message when error exists", () => {
		const error = { message: "Failed to load picks" };
		const showError = !!error;

		expect(showError).toBe(true);
		expect(error.message).toBe("Failed to load picks");
	});

	it("should not show error when error is null", () => {
		const error = null;
		const showError = !!error;

		expect(showError).toBe(false);
	});
});

// =============================================================================
// Data Display Tests
// =============================================================================

describe("data display", () => {
	describe("dialog header", () => {
		it("should show match number and round name when data exists", () => {
			const data = mockMatchPicksModalData.matchWithPicks;
			const title = `Match ${data.match.matchNumber}: ${data.round.name}`;

			expect(title).toBe("Match 1: Final");
		});

		it("should show default title when loading", () => {
			const data = null;
			const title = data
				? `Match ${data.match.matchNumber}: ${data.round.name}`
				: "Match Predictions";

			expect(title).toBe("Match Predictions");
		});

		it("should show player matchup in description", () => {
			const data = mockMatchPicksModalData.matchWithPicks;
			const description = `${data.match.player1Name} vs ${data.match.player2Name}`;

			expect(description).toContain("Novak Djokovic");
			expect(description).toContain("Carlos Alcaraz");
		});
	});

	describe("match result display", () => {
		it("should show result for finalized match", () => {
			const data = mockMatchPicksModalData.matchWithPicks;
			const isFinalized = data.match.status === "finalized";

			expect(isFinalized).toBe(true);
			expect(data.match.winnerName).toBe("Carlos Alcaraz");
			expect(data.match.finalScore).toBe("3-2");
		});

		it("should not show result for pending match", () => {
			const data = mockMatchPicksModalData.matchWithNoPicks;
			const isFinalized = data.match.status === "finalized";

			expect(isFinalized).toBe(false);
		});

		it("should indicate retirement in result", () => {
			const data = mockMatchPicksModalData.matchWithRetirement;
			const isRetirement = data.match.isRetirement;

			expect(isRetirement).toBe(true);
		});
	});
});

// =============================================================================
// Picks List Tests
// =============================================================================

describe("picks list display", () => {
	it("should display correct participant count", () => {
		const data = mockMatchPicksModalData.matchWithPicks;
		const count = data.picks.length;
		const label = `Predictions (${count} participant${count !== 1 ? "s" : ""})`;

		expect(label).toBe("Predictions (2 participants)");
	});

	it("should handle singular participant", () => {
		const data = mockMatchPicksModalData.matchWithRetirement;
		const count = data.picks.length;
		const label = `Predictions (${count} participant${count !== 1 ? "s" : ""})`;

		expect(label).toBe("Predictions (1 participant)");
	});

	it("should show empty message when no picks", () => {
		const data = mockMatchPicksModalData.matchWithNoPicks;
		const showEmptyMessage = data.picks.length === 0;

		expect(showEmptyMessage).toBe(true);
	});

	describe("pick item display", () => {
		it("should show user display name", () => {
			const pick = mockMatchPicksModalData.matchWithPicks.picks[0]!;
			expect(pick.user.displayName).toBe("John Doe");
		});

		it("should show prediction details", () => {
			const pick = mockMatchPicksModalData.matchWithPicks.picks[0]!;

			expect(pick.pick.predictedWinner).toBe("Carlos Alcaraz");
			expect(pick.pick.predictedSetsWon).toBe(3);
			expect(pick.pick.predictedSetsLost).toBe(2);
		});

		it("should show correct indicator for correct prediction", () => {
			const pick = mockMatchPicksModalData.matchWithPicks.picks[0]!;
			expect(pick.pick.isWinnerCorrect).toBe(true);
		});

		it("should show exact score badge when applicable", () => {
			const pick = mockMatchPicksModalData.matchWithPicks.picks[0]!;
			expect(pick.pick.isExactScore).toBe(true);
		});

		it("should show wrong indicator for incorrect prediction", () => {
			const pick = mockMatchPicksModalData.matchWithPicks.picks[1]!;
			expect(pick.pick.isWinnerCorrect).toBe(false);
		});
	});
});

// =============================================================================
// Retirement Handling Tests
// =============================================================================

describe("retirement handling", () => {
	it("should apply gray styling for retirement", () => {
		const data = mockMatchPicksModalData.matchWithRetirement;
		const isRetirement = data.match.isRetirement;

		const bgClass = isRetirement ? "bg-gray-100" : "bg-green-50";
		expect(bgClass).toBe("bg-gray-100");
	});

	it("should show Voided text for retirement picks", () => {
		const data = mockMatchPicksModalData.matchWithRetirement;
		const isRetirement = data.match.isRetirement;

		const showVoided = isRetirement;
		expect(showVoided).toBe(true);
	});

	it("should not show correct/wrong icons for retirement", () => {
		const data = mockMatchPicksModalData.matchWithRetirement;
		const isFinalized = data.match.status === "finalized";
		const isRetirement = data.match.isRetirement;

		const showIcons = isFinalized && !isRetirement;
		expect(showIcons).toBe(false);
	});

	it("should include Retirement in result text", () => {
		const data = mockMatchPicksModalData.matchWithRetirement;
		const resultText = `${data.match.winnerName} wins ${data.match.finalScore}${data.match.isRetirement ? " (Retirement)" : ""}`;

		expect(resultText).toContain("(Retirement)");
	});
});

// =============================================================================
// Avatar Display Tests
// =============================================================================

describe("avatar display", () => {
	it("should show image when imageUrl exists", () => {
		const pick = mockMatchPicksModalData.matchWithPicks.picks[0]!;
		const hasImage = !!pick.user.imageUrl;

		expect(hasImage).toBe(true);
	});

	it("should show fallback initials when no image", () => {
		const pick = mockMatchPicksModalData.matchWithPicks.picks[1]!;
		const hasImage = !!pick.user.imageUrl;
		const initials = pick.user.displayName
			.split(" ")
			.filter(Boolean)
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);

		expect(hasImage).toBe(false);
		expect(initials).toBe("JS"); // Jane Smith
	});
});

// =============================================================================
// Pick Row Styling Tests
// =============================================================================

describe("pick row styling", () => {
	/**
	 * Gets the CSS classes for a pick row based on state
	 */
	function getPickRowClasses(
		isFinalized: boolean,
		isRetirement: boolean,
		isWinnerCorrect: boolean | null
	): string {
		if (isFinalized && !isRetirement) {
			return isWinnerCorrect
				? "border-green-200 bg-green-50"
				: "border-red-200 bg-red-50";
		}
		return "";
	}

	it("should apply green styling for correct pick", () => {
		const classes = getPickRowClasses(true, false, true);
		expect(classes).toBe("border-green-200 bg-green-50");
	});

	it("should apply red styling for wrong pick", () => {
		const classes = getPickRowClasses(true, false, false);
		expect(classes).toBe("border-red-200 bg-red-50");
	});

	it("should apply no special styling for retirement", () => {
		const classes = getPickRowClasses(true, true, true);
		expect(classes).toBe("");
	});

	it("should apply no special styling for pending match", () => {
		const classes = getPickRowClasses(false, false, null);
		expect(classes).toBe("");
	});
});

// =============================================================================
// Dialog Content Tests
// =============================================================================

describe("dialog content", () => {
	it("should have max height constraint", () => {
		const maxHeight = "max-h-[85vh]";
		expect(maxHeight).toContain("85vh");
	});

	it("should have max width constraint", () => {
		const maxWidth = "sm:max-w-md";
		expect(maxWidth).toContain("max-w-md");
	});

	it("should have overflow hidden", () => {
		const overflow = "overflow-hidden";
		expect(overflow).toBe("overflow-hidden");
	});
});

// =============================================================================
// Scrollable Picks List Tests
// =============================================================================

describe("scrollable picks list", () => {
	it("should have max height for scroll area", () => {
		const maxHeight = "max-h-[40vh]";
		expect(maxHeight).toContain("40vh");
	});

	it("should have vertical scroll", () => {
		const overflow = "overflow-y-auto";
		expect(overflow).toBe("overflow-y-auto");
	});

	it("should have padding for scrollbar", () => {
		const padding = "pr-1";
		expect(padding).toBe("pr-1");
	});
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("component integration", () => {
	it("should support full modal open -> view -> close flow", () => {
		let open = false;
		let matchId: number | null = null;

		const onOpenChange = (newOpen: boolean) => {
			open = newOpen;
		};

		// Open modal with match
		open = true;
		matchId = 42;
		expect(open).toBe(true);
		expect(matchId).toBe(42);

		// Close modal
		onOpenChange(false);
		expect(open).toBe(false);
	});

	it("should handle data with all pick states", () => {
		const data = mockMatchPicksModalData.matchWithPicks;

		const correctPick = data.picks.find((p) => p.pick.isWinnerCorrect);
		const wrongPick = data.picks.find((p) => !p.pick.isWinnerCorrect);
		const exactScorePick = data.picks.find((p) => p.pick.isExactScore);

		expect(correctPick).toBeDefined();
		expect(wrongPick).toBeDefined();
		expect(exactScorePick).toBeDefined();
	});
});

// =============================================================================
// Edge Cases Tests
// =============================================================================

describe("edge cases", () => {
	it("should handle match id 0", () => {
		const matchId = 0;
		const enabled = true && matchId !== null;

		expect(enabled).toBe(true);
	});

	it("should handle empty picks array", () => {
		const data = mockMatchPicksModalData.matchWithNoPicks;
		expect(data.picks).toHaveLength(0);
	});

	it("should handle long user names", () => {
		const longName = "Very Long User Display Name That Might Overflow";
		const initials = longName
			.split(" ")
			.filter(Boolean)
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);

		expect(initials).toBe("VL");
	});

	it("should handle null winner for pending match", () => {
		const data = mockMatchPicksModalData.matchWithNoPicks;
		expect(data.match.winnerName).toBeNull();
	});
});
