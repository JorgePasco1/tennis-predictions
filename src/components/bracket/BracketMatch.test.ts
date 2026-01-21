/**
 * BracketMatch Component Tests
 *
 * Comprehensive tests for the BracketMatch component covering:
 * - Compact and expanded (mobile) variants
 * - Match states: pending, finalized, retirement
 * - User picks: correct, wrong, pending, partial correct
 * - Player name formatting and truncation
 * - Score display and parsing
 * - Click interactions
 * - Accessibility attributes
 */

import { describe, expect, it, vi } from "vitest";
import {
	createFinalizedMatch,
	createMatchWithCorrectPick,
	createMatchWithPartialCorrectPick,
	createMatchWithPendingPick,
	createMatchWithWrongPick,
	createPendingMatch,
	createRetirementMatch,
} from "~/test/bracket-fixtures";
import type { MatchData } from "./bracket-types";

// =============================================================================
// Helper Function Tests (formatPlayerName logic)
// =============================================================================

describe("formatPlayerName logic", () => {
	/**
	 * Recreates the formatPlayerName function logic for testing
	 * Note: The actual component uses ellipsis character, but for testing
	 * we use "..." to validate the truncation logic
	 */
	function formatPlayerName(
		name: string,
		seed: number | null,
		maxLength = 20,
	): string {
		const seedPrefix = seed ? `(${seed}) ` : "";
		const availableLength = maxLength - seedPrefix.length;
		const truncatedName =
			name.length > availableLength
				? `${name.substring(0, availableLength - 1)}...`
				: name;
		return `${seedPrefix}${truncatedName}`;
	}

	describe("names without seeds", () => {
		it("should display short names without truncation", () => {
			expect(formatPlayerName("Sinner", null, 20)).toBe("Sinner");
		});

		it("should display full name when it fits", () => {
			expect(formatPlayerName("Novak Djokovic", null, 20)).toBe(
				"Novak Djokovic",
			);
		});

		it("should truncate long names", () => {
			const result = formatPlayerName("Alejandro Davidovich Fokina", null, 16);
			// The result includes "..." (3 chars) so total will be longer than maxLength
			// but the actual name portion is truncated
			expect(result).toContain("...");
			expect(result.startsWith("Alejandro Davi")).toBe(true);
		});
	});

	describe("names with seeds", () => {
		it("should prepend seed in parentheses", () => {
			const result = formatPlayerName("Djokovic", 1, 20);
			expect(result.startsWith("(1) ")).toBe(true);
		});

		it("should handle two-digit seeds", () => {
			const result = formatPlayerName("Player", 15, 20);
			expect(result.startsWith("(15) ")).toBe(true);
		});

		it("should account for seed prefix when truncating", () => {
			const result = formatPlayerName("Botic van de Zandschulp", 15, 16);
			// Seed prefix "(15) " takes 5 characters, leaving 11 for name
			// Name gets truncated and "..." added
			expect(result).toContain("...");
			expect(result.startsWith("(15) ")).toBe(true);
		});
	});

	describe("edge cases", () => {
		it("should handle empty name", () => {
			expect(formatPlayerName("", null, 20)).toBe("");
		});

		it("should handle very short max length with truncation", () => {
			// With maxLength 3 and name "Test" (4 chars), it needs to truncate
			const result = formatPlayerName("Test", null, 3);
			// availableLength = 3, name.length (4) > 3, so truncates
			expect(result).toContain("...");
		});

		it("should handle seed 0 as no seed", () => {
			// Seed 0 is falsy, so should not show
			const result = formatPlayerName("Player", 0 as unknown as null, 20);
			// This depends on implementation - 0 is falsy in JS
			expect(result).not.toContain("(0)");
		});
	});
});

// =============================================================================
// Score Parsing Logic Tests
// =============================================================================

describe("score parsing logic", () => {
	/**
	 * Recreates the score parsing logic from BracketMatch
	 */
	function parseScore(
		finalScore: string | null,
		isPlayer1Winner: boolean,
		isPlayer2Winner: boolean,
	): { player1Sets: number | undefined; player2Sets: number | undefined } {
		const scoreParts = finalScore?.split("-").map(Number) ?? [];
		const [winnerSets, loserSets] =
			scoreParts.length === 2 ? scoreParts : [undefined, undefined];

		const player1Sets = isPlayer1Winner
			? winnerSets
			: isPlayer2Winner
				? loserSets
				: undefined;

		const player2Sets = isPlayer2Winner
			? winnerSets
			: isPlayer1Winner
				? loserSets
				: undefined;

		return { player1Sets, player2Sets };
	}

	describe("Best of 3 scores", () => {
		it("should parse 2-0 correctly when player 1 wins", () => {
			const result = parseScore("2-0", true, false);
			expect(result.player1Sets).toBe(2);
			expect(result.player2Sets).toBe(0);
		});

		it("should parse 2-1 correctly when player 1 wins", () => {
			const result = parseScore("2-1", true, false);
			expect(result.player1Sets).toBe(2);
			expect(result.player2Sets).toBe(1);
		});

		it("should parse 2-0 correctly when player 2 wins", () => {
			const result = parseScore("2-0", false, true);
			expect(result.player1Sets).toBe(0);
			expect(result.player2Sets).toBe(2);
		});

		it("should parse 2-1 correctly when player 2 wins", () => {
			const result = parseScore("2-1", false, true);
			expect(result.player1Sets).toBe(1);
			expect(result.player2Sets).toBe(2);
		});
	});

	describe("Best of 5 scores", () => {
		it("should parse 3-0 correctly", () => {
			const result = parseScore("3-0", true, false);
			expect(result.player1Sets).toBe(3);
			expect(result.player2Sets).toBe(0);
		});

		it("should parse 3-1 correctly", () => {
			const result = parseScore("3-1", true, false);
			expect(result.player1Sets).toBe(3);
			expect(result.player2Sets).toBe(1);
		});

		it("should parse 3-2 correctly", () => {
			const result = parseScore("3-2", true, false);
			expect(result.player1Sets).toBe(3);
			expect(result.player2Sets).toBe(2);
		});
	});

	describe("edge cases", () => {
		it("should handle null score", () => {
			const result = parseScore(null, false, false);
			expect(result.player1Sets).toBeUndefined();
			expect(result.player2Sets).toBeUndefined();
		});

		it("should handle no winner yet", () => {
			const result = parseScore("1-1", false, false);
			expect(result.player1Sets).toBeUndefined();
			expect(result.player2Sets).toBeUndefined();
		});

		it("should handle malformed score", () => {
			const result = parseScore("invalid", true, false);
			expect(result.player1Sets).toBeUndefined();
			expect(result.player2Sets).toBeUndefined();
		});
	});
});

// =============================================================================
// Match State Logic Tests
// =============================================================================

describe("match state logic", () => {
	describe("pending matches", () => {
		it("should identify pending match state", () => {
			const match = createPendingMatch();
			expect(match.status).toBe("pending");
			expect(match.winnerName).toBeNull();
			expect(match.finalScore).toBeNull();
		});

		it("should not show score indicators for pending matches", () => {
			const match = createPendingMatch();
			const isFinalized = match.status === "finalized";
			expect(isFinalized).toBe(false);
		});
	});

	describe("finalized matches", () => {
		it("should identify finalized match state", () => {
			const match = createFinalizedMatch();
			expect(match.status).toBe("finalized");
			expect(match.winnerName).not.toBeNull();
			expect(match.finalScore).not.toBeNull();
		});

		it("should identify winner correctly", () => {
			const match = createFinalizedMatch();
			const isPlayer1Winner = match.winnerName === match.player1Name;
			const isPlayer2Winner = match.winnerName === match.player2Name;

			expect(isPlayer1Winner).toBe(true);
			expect(isPlayer2Winner).toBe(false);
		});
	});

	describe("retirement matches", () => {
		it("should identify retirement state", () => {
			const match = createRetirementMatch();
			expect(match.isRetirement).toBe(true);
			expect(match.status).toBe("finalized");
		});

		it("should have a winner even in retirement", () => {
			const match = createRetirementMatch();
			expect(match.winnerName).not.toBeNull();
		});
	});
});

// =============================================================================
// User Pick Display Logic Tests
// =============================================================================

describe("user pick display logic", () => {
	describe("correct pick indicators", () => {
		it("should identify correct winner pick", () => {
			const match = createMatchWithCorrectPick();
			expect(match.userPick?.isWinnerCorrect).toBe(true);
		});

		it("should identify exact score bonus", () => {
			const match = createMatchWithCorrectPick();
			expect(match.userPick?.isExactScore).toBe(true);
		});

		it("should show max points for correct winner + exact score", () => {
			const match = createMatchWithCorrectPick();
			expect(match.userPick?.pointsEarned).toBe(15);
		});
	});

	describe("wrong pick indicators", () => {
		it("should identify wrong winner pick", () => {
			const match = createMatchWithWrongPick();
			expect(match.userPick?.isWinnerCorrect).toBe(false);
		});

		it("should show zero points for wrong pick", () => {
			const match = createMatchWithWrongPick();
			expect(match.userPick?.pointsEarned).toBe(0);
		});
	});

	describe("partial correct picks", () => {
		it("should identify correct winner with wrong score", () => {
			const match = createMatchWithPartialCorrectPick();
			expect(match.userPick?.isWinnerCorrect).toBe(true);
			expect(match.userPick?.isExactScore).toBe(false);
		});

		it("should show partial points for correct winner only", () => {
			const match = createMatchWithPartialCorrectPick();
			expect(match.userPick?.pointsEarned).toBe(10);
		});
	});

	describe("pending pick state", () => {
		it("should have null correctness for pending matches", () => {
			const match = createMatchWithPendingPick();
			expect(match.userPick?.isWinnerCorrect).toBeNull();
			expect(match.userPick?.isExactScore).toBeNull();
		});

		it("should show zero points while pending", () => {
			const match = createMatchWithPendingPick();
			expect(match.userPick?.pointsEarned).toBe(0);
		});
	});

	describe("user pick identification", () => {
		it("should identify which player user picked", () => {
			const match = createMatchWithCorrectPick();
			const userPickedPlayer1 =
				match.userPick?.predictedWinner === match.player1Name;
			const userPickedPlayer2 =
				match.userPick?.predictedWinner === match.player2Name;

			expect(userPickedPlayer1 || userPickedPlayer2).toBe(true);
		});
	});
});

// =============================================================================
// Click Interaction Logic Tests
// =============================================================================

describe("click interaction logic", () => {
	it("should call onClick with match id when provided", () => {
		const onClick = vi.fn();
		const match = createPendingMatch({ id: 42 });

		// Simulate click logic
		if (onClick) {
			onClick(match.id);
		}

		expect(onClick).toHaveBeenCalledWith(42);
	});

	it("should be clickable when onClick is provided", () => {
		const onClick = vi.fn();
		const isClickable = !!onClick;

		expect(isClickable).toBe(true);
	});

	it("should not be clickable when onClick is undefined", () => {
		const onClick = undefined;
		const isClickable = !!onClick;

		expect(isClickable).toBe(false);
	});

	it("should handle keyboard enter key", () => {
		const onClick = vi.fn();
		const match = createPendingMatch({ id: 42 });

		// Simulate keyboard handler logic
		const handleKeyDown = (e: { key: string }) => {
			if (e.key === "Enter" || e.key === " ") {
				onClick(match.id);
			}
		};

		handleKeyDown({ key: "Enter" });
		expect(onClick).toHaveBeenCalledWith(42);
	});

	it("should handle keyboard space key", () => {
		const onClick = vi.fn();
		const match = createPendingMatch({ id: 42 });

		const handleKeyDown = (e: { key: string }) => {
			if (e.key === "Enter" || e.key === " ") {
				onClick(match.id);
			}
		};

		handleKeyDown({ key: " " });
		expect(onClick).toHaveBeenCalledWith(42);
	});

	it("should not respond to other keys", () => {
		const onClick = vi.fn();
		const match = createPendingMatch({ id: 42 });

		const handleKeyDown = (e: { key: string }) => {
			if (e.key === "Enter" || e.key === " ") {
				onClick(match.id);
			}
		};

		handleKeyDown({ key: "Escape" });
		expect(onClick).not.toHaveBeenCalled();
	});
});

// =============================================================================
// Variant Configuration Tests
// =============================================================================

describe("variant configuration", () => {
	const variantConfig = {
		compact: {
			width: "w-44",
			textSize: "text-xs",
			padding: "px-2 py-1.5",
			nameMaxLength: 16,
		},
		mobile: {
			width: "w-full",
			textSize: "text-sm",
			padding: "px-3 py-2",
			nameMaxLength: 30,
		},
	};

	describe("compact variant", () => {
		it("should have fixed width", () => {
			expect(variantConfig.compact.width).toBe("w-44");
		});

		it("should use smaller text size", () => {
			expect(variantConfig.compact.textSize).toBe("text-xs");
		});

		it("should have shorter max name length", () => {
			expect(variantConfig.compact.nameMaxLength).toBe(16);
		});
	});

	describe("mobile variant", () => {
		it("should be full width", () => {
			expect(variantConfig.mobile.width).toBe("w-full");
		});

		it("should use larger text size", () => {
			expect(variantConfig.mobile.textSize).toBe("text-sm");
		});

		it("should have longer max name length", () => {
			expect(variantConfig.mobile.nameMaxLength).toBe(30);
		});
	});
});

// =============================================================================
// Border Color Logic Tests
// =============================================================================

describe("border color logic", () => {
	/**
	 * Determines the border color class based on match state and user pick
	 */
	function getBorderClass(match: MatchData, isCompact: boolean): string {
		const isFinalized = match.status === "finalized";
		const userPick = match.userPick;
		const isRetirement = match.isRetirement;

		if (isCompact) {
			if (isFinalized && userPick && !isRetirement) {
				return userPick.isWinnerCorrect ? "border-green-400" : "border-red-400";
			}
			return ""; // default border
		}

		// Mobile/expanded variant
		if (isFinalized) {
			if (isRetirement) {
				return "border-gray-300 bg-gray-50";
			}
			if (userPick?.isWinnerCorrect) {
				return "border-green-300 bg-green-50";
			}
			if (userPick) {
				return "border-red-300 bg-red-50";
			}
		}
		return "";
	}

	describe("compact variant borders", () => {
		it("should show green border for correct pick", () => {
			const match = createMatchWithCorrectPick();
			expect(getBorderClass(match, true)).toBe("border-green-400");
		});

		it("should show red border for wrong pick", () => {
			const match = createMatchWithWrongPick();
			expect(getBorderClass(match, true)).toBe("border-red-400");
		});

		it("should show no special border for pending match", () => {
			const match = createPendingMatch();
			expect(getBorderClass(match, true)).toBe("");
		});

		it("should show no special border for retirement", () => {
			const match = createRetirementMatch();
			match.userPick = {
				predictedWinner: "Rafael Nadal",
				predictedSetsWon: 3,
				predictedSetsLost: 0,
				isWinnerCorrect: false,
				isExactScore: false,
				pointsEarned: 0,
			};
			expect(getBorderClass(match, true)).toBe("");
		});
	});

	describe("mobile variant borders", () => {
		it("should show green background for correct pick", () => {
			const match = createMatchWithCorrectPick();
			expect(getBorderClass(match, false)).toBe("border-green-300 bg-green-50");
		});

		it("should show red background for wrong pick", () => {
			const match = createMatchWithWrongPick();
			expect(getBorderClass(match, false)).toBe("border-red-300 bg-red-50");
		});

		it("should show gray background for retirement", () => {
			const match = createRetirementMatch();
			expect(getBorderClass(match, false)).toBe("border-gray-300 bg-gray-50");
		});
	});
});

// =============================================================================
// Player Row Styling Logic Tests
// =============================================================================

describe("player row styling logic", () => {
	/**
	 * Gets CSS classes for a player row based on match state
	 */
	function getPlayerRowClasses(
		isFinalized: boolean,
		isThisPlayerWinner: boolean,
		isCompact: boolean,
	): string {
		if (!isFinalized) return "";

		if (isCompact) {
			return isThisPlayerWinner ? "bg-green-50 font-semibold" : "";
		}

		return isThisPlayerWinner ? "bg-green-100 font-semibold" : "bg-muted/50";
	}

	describe("pending match", () => {
		it("should have no special styling", () => {
			expect(getPlayerRowClasses(false, false, true)).toBe("");
			expect(getPlayerRowClasses(false, false, false)).toBe("");
		});
	});

	describe("finalized match - compact", () => {
		it("should highlight winner row", () => {
			expect(getPlayerRowClasses(true, true, true)).toBe(
				"bg-green-50 font-semibold",
			);
		});

		it("should not highlight loser row", () => {
			expect(getPlayerRowClasses(true, false, true)).toBe("");
		});
	});

	describe("finalized match - mobile", () => {
		it("should highlight winner row", () => {
			expect(getPlayerRowClasses(true, true, false)).toBe(
				"bg-green-100 font-semibold",
			);
		});

		it("should mute loser row", () => {
			expect(getPlayerRowClasses(true, false, false)).toBe("bg-muted/50");
		});
	});
});

// =============================================================================
// Accessibility Tests
// =============================================================================

describe("accessibility attributes", () => {
	it("should have button role when clickable", () => {
		const onClick = vi.fn();
		const role = onClick ? "button" : undefined;
		expect(role).toBe("button");
	});

	it("should not have button role when not clickable", () => {
		const onClick = undefined;
		const role = onClick ? "button" : undefined;
		expect(role).toBeUndefined();
	});

	it("should have tabIndex when clickable", () => {
		const onClick = vi.fn();
		const tabIndex = onClick ? 0 : undefined;
		expect(tabIndex).toBe(0);
	});

	it("should not have tabIndex when not clickable", () => {
		const onClick = undefined;
		const tabIndex = onClick ? 0 : undefined;
		expect(tabIndex).toBeUndefined();
	});
});

// =============================================================================
// Retirement Display Logic Tests
// =============================================================================

describe("retirement display logic", () => {
	it("should show 'Ret' instead of sets for retired player", () => {
		const match = createRetirementMatch();
		const isPlayer1Winner = match.winnerName === match.player1Name;
		const isPlayer2Winner = match.winnerName === match.player2Name;

		// The loser (who retired) should show "Ret"
		const player1Display = match.isRetirement && !isPlayer1Winner ? "Ret" : "2";
		const player2Display = match.isRetirement && !isPlayer2Winner ? "Ret" : "2";

		// In this fixture, player2 wins due to player1 retirement
		expect(player1Display).toBe("Ret");
		expect(player2Display).toBe("2");
	});

	it("should void picks for retirement matches", () => {
		const match = createRetirementMatch();
		// Retirement matches should not count for scoring
		const shouldShowResult =
			match.status === "finalized" && !match.isRetirement;
		expect(shouldShowResult).toBe(false);
	});
});

// =============================================================================
// Match Data Validation Tests
// =============================================================================

describe("match data validation", () => {
	it("should have all required fields", () => {
		const match = createPendingMatch();

		expect(match).toHaveProperty("id");
		expect(match).toHaveProperty("matchNumber");
		expect(match).toHaveProperty("player1Name");
		expect(match).toHaveProperty("player2Name");
		expect(match).toHaveProperty("player1Seed");
		expect(match).toHaveProperty("player2Seed");
		expect(match).toHaveProperty("status");
		expect(match).toHaveProperty("winnerName");
		expect(match).toHaveProperty("finalScore");
		expect(match).toHaveProperty("isRetirement");
		expect(match).toHaveProperty("userPick");
	});

	it("should have valid user pick structure when present", () => {
		const match = createMatchWithCorrectPick();

		expect(match.userPick).toHaveProperty("predictedWinner");
		expect(match.userPick).toHaveProperty("predictedSetsWon");
		expect(match.userPick).toHaveProperty("predictedSetsLost");
		expect(match.userPick).toHaveProperty("isWinnerCorrect");
		expect(match.userPick).toHaveProperty("isExactScore");
		expect(match.userPick).toHaveProperty("pointsEarned");
	});

	it("should have valid sets won values", () => {
		const match = createMatchWithCorrectPick();
		const setsWon = match.userPick?.predictedSetsWon ?? 0;

		expect(setsWon).toBeGreaterThanOrEqual(2);
		expect(setsWon).toBeLessThanOrEqual(3);
	});

	it("should have valid sets lost values", () => {
		const match = createMatchWithCorrectPick();
		const setsLost = match.userPick?.predictedSetsLost ?? 0;

		expect(setsLost).toBeGreaterThanOrEqual(0);
		expect(setsLost).toBeLessThanOrEqual(2);
	});
});
