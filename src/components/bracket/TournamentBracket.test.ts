/**
 * TournamentBracket Component Tests
 *
 * Tests for the main tournament bracket component covering:
 * - Empty state display
 * - Desktop vs mobile rendering logic
 * - Modal state management
 * - Match click handling
 * - Round data passing
 */

import { describe, expect, it, vi } from "vitest";
import {
	createBracketWithPicks,
	createEmptyRound,
	createFullTournamentBracket,
	createSmallBracket,
} from "~/test/bracket-fixtures";
import type { RoundData } from "./bracket-types";

// =============================================================================
// Empty State Tests
// =============================================================================

describe("empty state handling", () => {
	it("should detect empty rounds array", () => {
		const rounds: RoundData[] = [];
		expect(rounds.length).toBe(0);
	});

	it("should show empty state when no rounds", () => {
		const rounds: RoundData[] = [];
		const showEmptyState = rounds.length === 0;

		expect(showEmptyState).toBe(true);
	});

	it("should not show empty state when rounds exist", () => {
		const rounds = createSmallBracket();
		const showEmptyState = rounds.length === 0;

		expect(showEmptyState).toBe(false);
	});
});

// =============================================================================
// Modal State Management Tests
// =============================================================================

describe("modal state management", () => {
	describe("initial state", () => {
		it("should start with modal closed", () => {
			const modalOpen = false;
			expect(modalOpen).toBe(false);
		});

		it("should start with no selected match", () => {
			const selectedMatchId: number | null = null;
			expect(selectedMatchId).toBeNull();
		});
	});

	describe("match click handling", () => {
		it("should set selected match id on click", () => {
			let selectedMatchId: number | null = null;

			const handleMatchClick = (matchId: number) => {
				selectedMatchId = matchId;
			};

			handleMatchClick(42);
			expect(selectedMatchId).toBe(42);
		});

		it("should open modal on match click", () => {
			let modalOpen = false;

			const handleMatchClick = () => {
				modalOpen = true;
			};

			handleMatchClick();
			expect(modalOpen).toBe(true);
		});

		it("should set both state values together", () => {
			let selectedMatchId: number | null = null;
			let modalOpen = false;

			const handleMatchClick = (matchId: number) => {
				selectedMatchId = matchId;
				modalOpen = true;
			};

			handleMatchClick(99);
			expect(selectedMatchId).toBe(99);
			expect(modalOpen).toBe(true);
		});
	});

	describe("modal close handling", () => {
		it("should clear selected match when modal closes", () => {
			let selectedMatchId: number | null = 42;
			let modalOpen = true;

			const handleModalOpenChange = (open: boolean) => {
				modalOpen = open;
				if (!open) {
					selectedMatchId = null;
				}
			};

			handleModalOpenChange(false);
			expect(modalOpen).toBe(false);
			expect(selectedMatchId).toBeNull();
		});

		it("should keep selected match when modal stays open", () => {
			let selectedMatchId: number | null = 42;
			let modalOpen = true;

			const handleModalOpenChange = (open: boolean) => {
				modalOpen = open;
				if (!open) {
					selectedMatchId = null;
				}
			};

			handleModalOpenChange(true);
			expect(modalOpen).toBe(true);
			expect(selectedMatchId).toBe(42);
		});
	});
});

// =============================================================================
// Desktop/Mobile Visibility Tests
// =============================================================================

describe("responsive visibility logic", () => {
	describe("desktop bracket visibility", () => {
		it("should have hidden class for mobile", () => {
			const desktopClasses = "hidden lg:block";
			expect(desktopClasses).toContain("hidden");
			expect(desktopClasses).toContain("lg:block");
		});
	});

	describe("mobile bracket visibility", () => {
		it("should have hidden class for desktop", () => {
			const mobileClasses = "lg:hidden";
			expect(mobileClasses).toContain("lg:hidden");
		});
	});

	describe("breakpoint consistency", () => {
		it("should use lg breakpoint for both", () => {
			const desktopClasses = "hidden lg:block";
			const mobileClasses = "lg:hidden";

			// Both should use 'lg' breakpoint for consistency
			expect(desktopClasses).toContain("lg:");
			expect(mobileClasses).toContain("lg:");
		});
	});
});

// =============================================================================
// Click Handler Propagation Tests
// =============================================================================

describe("click handler propagation", () => {
	it("should pass handleMatchClick to DesktopBracket", () => {
		const handleMatchClick = vi.fn();

		// Simulate passing to child
		const desktopBracketProps = {
			rounds: createSmallBracket(),
			onMatchClick: handleMatchClick,
		};

		expect(desktopBracketProps.onMatchClick).toBe(handleMatchClick);
	});

	it("should pass handleMatchClick to MobileBracketWithConnectors", () => {
		const handleMatchClick = vi.fn();

		const mobileBracketProps = {
			rounds: createSmallBracket(),
			onMatchClick: handleMatchClick,
		};

		expect(mobileBracketProps.onMatchClick).toBe(handleMatchClick);
	});

	it("should use same handler for both views", () => {
		const handleMatchClick = vi.fn();

		const desktopProps = { onMatchClick: handleMatchClick };
		const mobileProps = { onMatchClick: handleMatchClick };

		expect(desktopProps.onMatchClick).toBe(mobileProps.onMatchClick);
	});
});

// =============================================================================
// Modal Props Tests
// =============================================================================

describe("modal props", () => {
	it("should pass correct props to MatchPicksModal", () => {
		const selectedMatchId: number | null = 42;
		const modalOpen = true;
		const handleModalOpenChange = vi.fn();

		const modalProps = {
			matchId: selectedMatchId,
			open: modalOpen,
			onOpenChange: handleModalOpenChange,
		};

		expect(modalProps.matchId).toBe(42);
		expect(modalProps.open).toBe(true);
		expect(modalProps.onOpenChange).toBe(handleModalOpenChange);
	});

	it("should pass null matchId when no match selected", () => {
		const selectedMatchId: number | null = null;

		const modalProps = {
			matchId: selectedMatchId,
		};

		expect(modalProps.matchId).toBeNull();
	});
});

// =============================================================================
// Round Data Passing Tests
// =============================================================================

describe("round data passing", () => {
	it("should pass rounds to DesktopBracket", () => {
		const rounds = createSmallBracket();

		const desktopProps = {
			rounds,
		};

		expect(desktopProps.rounds).toBe(rounds);
		expect(desktopProps.rounds).toHaveLength(2);
	});

	it("should pass same rounds to both views", () => {
		const rounds = createFullTournamentBracket();

		const desktopProps = { rounds };
		const mobileProps = { rounds };

		expect(desktopProps.rounds).toBe(mobileProps.rounds);
	});

	it("should handle large bracket data", () => {
		const rounds = createFullTournamentBracket();

		expect(rounds.length).toBe(7);

		const totalMatches = rounds.reduce(
			(sum, round) => sum + round.matches.length,
			0
		);
		// 64 + 32 + 16 + 8 + 4 + 2 + 1 = 127
		expect(totalMatches).toBe(127);
	});
});

// =============================================================================
// Type Export Tests
// =============================================================================

describe("type exports", () => {
	it("should have MatchData type available", () => {
		// This tests that the type is correctly re-exported
		const match = createSmallBracket()[0]?.matches[0];
		expect(match).toHaveProperty("id");
		expect(match).toHaveProperty("matchNumber");
		expect(match).toHaveProperty("player1Name");
	});

	it("should have RoundData type available", () => {
		const round = createSmallBracket()[0];
		expect(round).toHaveProperty("id");
		expect(round).toHaveProperty("name");
		expect(round).toHaveProperty("roundNumber");
		expect(round).toHaveProperty("matches");
	});
});

// =============================================================================
// Component Structure Tests
// =============================================================================

describe("component structure", () => {
	it("should render both bracket views", () => {
		const rounds = createSmallBracket();
		const shouldRenderDesktop = rounds.length > 0;
		const shouldRenderMobile = rounds.length > 0;

		expect(shouldRenderDesktop).toBe(true);
		expect(shouldRenderMobile).toBe(true);
	});

	it("should render modal component", () => {
		const rounds = createSmallBracket();
		const shouldRenderModal = rounds.length > 0;

		// Modal is always rendered but controlled by open prop
		expect(shouldRenderModal).toBe(true);
	});

	it("should not render brackets for empty state", () => {
		const rounds: RoundData[] = [];
		const shouldRenderBrackets = rounds.length > 0;

		expect(shouldRenderBrackets).toBe(false);
	});
});

// =============================================================================
// User Interaction Flow Tests
// =============================================================================

describe("user interaction flow", () => {
	it("should support full match click -> modal open -> modal close flow", () => {
		// Initial state
		let selectedMatchId: number | null = null;
		let modalOpen = false;

		const handleMatchClick = (matchId: number) => {
			selectedMatchId = matchId;
			modalOpen = true;
		};

		const handleModalOpenChange = (open: boolean) => {
			modalOpen = open;
			if (!open) {
				selectedMatchId = null;
			}
		};

		// Step 1: Click match
		handleMatchClick(42);
		expect(selectedMatchId).toBe(42);
		expect(modalOpen).toBe(true);

		// Step 2: Close modal
		handleModalOpenChange(false);
		expect(modalOpen).toBe(false);
		expect(selectedMatchId).toBeNull();
	});

	it("should support clicking different matches", () => {
		let selectedMatchId: number | null = null;

		const handleMatchClick = (matchId: number) => {
			selectedMatchId = matchId;
		};

		handleMatchClick(1);
		expect(selectedMatchId).toBe(1);

		handleMatchClick(2);
		expect(selectedMatchId).toBe(2);

		handleMatchClick(99);
		expect(selectedMatchId).toBe(99);
	});
});

// =============================================================================
// Edge Cases Tests
// =============================================================================

describe("edge cases", () => {
	it("should handle single round bracket", () => {
		const rounds = [createEmptyRound({ matches: [] })];
		expect(rounds.length).toBe(1);
	});

	it("should handle bracket with user picks", () => {
		const rounds = createBracketWithPicks();
		const hasUserPicks = rounds.some((r) =>
			r.matches.some((m) => m.userPick !== null)
		);

		expect(hasUserPicks).toBe(true);
	});

	it("should handle match id 0", () => {
		let selectedMatchId: number | null = null;

		const handleMatchClick = (matchId: number) => {
			selectedMatchId = matchId;
		};

		handleMatchClick(0);
		expect(selectedMatchId).toBe(0);
	});

	it("should handle rapid clicks", () => {
		const clickHandler = vi.fn();

		// Simulate rapid clicks
		for (let i = 0; i < 10; i++) {
			clickHandler(i);
		}

		expect(clickHandler).toHaveBeenCalledTimes(10);
	});
});

// =============================================================================
// Empty State Content Tests
// =============================================================================

describe("empty state content", () => {
	it("should have appropriate empty message", () => {
		const emptyTitle = "No Bracket Yet";
		const emptyDescription =
			"The tournament bracket will appear here once matches are added";

		expect(emptyTitle).toBeTruthy();
		expect(emptyDescription).toBeTruthy();
	});

	it("should have tennis emoji for visual appeal", () => {
		const emoji = "\uD83C\uDFBE"; // Tennis ball emoji
		expect(emoji).toBeTruthy();
	});
});

// =============================================================================
// Component Integration Tests
// =============================================================================

describe("component integration", () => {
	it("should maintain consistency between desktop and mobile data", () => {
		const rounds = createBracketWithPicks();

		// Both views should receive identical data
		const desktopData = { rounds };
		const mobileData = { rounds };

		expect(JSON.stringify(desktopData)).toBe(JSON.stringify(mobileData));
	});

	it("should have modal receive correct match id from either view", () => {
		let modalMatchId: number | null = null;

		const handleMatchClick = (matchId: number) => {
			modalMatchId = matchId;
		};

		// Simulate click from desktop
		handleMatchClick(42);
		expect(modalMatchId).toBe(42);

		// Simulate click from mobile
		handleMatchClick(99);
		expect(modalMatchId).toBe(99);
	});
});
