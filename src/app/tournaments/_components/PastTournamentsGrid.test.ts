/**
 * PastTournamentsGrid Component Logic Tests
 *
 * Tests pagination and formatting behavior for past tournaments display.
 */

import { describe, expect, it } from "vitest";

interface PastTournament {
	id: number;
	slug: string;
	name: string;
	year: number;
	closedAt: string | null;
	uploadedBy: string;
}

function buildTournaments(count: number): PastTournament[] {
	return Array.from({ length: count }, (_, index) => ({
		id: index + 1,
		slug: `tournament-${index + 1}`,
		name: `Tournament ${index + 1}`,
		year: 2024,
		closedAt: "2024-06-15T12:00:00.000Z",
		uploadedBy: "Test Admin",
	}));
}

function getPaginationState(
	tournaments: PastTournament[],
	visibleCount: number,
) {
	return {
		visible: tournaments.slice(0, visibleCount),
		hasMore: visibleCount < tournaments.length,
	};
}

function getNextVisibleCount(
	current: number,
	increment: number,
	total: number,
) {
	return Math.min(current + increment, total);
}

function formatClosedAt(dateString: string | null) {
	if (!dateString) return "date unavailable";
	return new Date(dateString).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

// =============================================================================
// Pagination Tests
// =============================================================================

describe("PastTournamentsGrid pagination", () => {
	it("should show initial subset and indicate more items", () => {
		const tournaments = buildTournaments(10);
		const { visible, hasMore } = getPaginationState(tournaments, 6);

		expect(visible.length).toBe(6);
		expect(visible[0]?.id).toBe(1);
		expect(visible[5]?.id).toBe(6);
		expect(hasMore).toBe(true);
	});

	it("should show all items when total is below initial count", () => {
		const tournaments = buildTournaments(4);
		const { visible, hasMore } = getPaginationState(tournaments, 6);

		expect(visible.length).toBe(4);
		expect(hasMore).toBe(false);
	});

	it("should increment visible count without exceeding total", () => {
		const tournaments = buildTournaments(10);
		const firstCount = 6;
		const nextCount = getNextVisibleCount(firstCount, 6, tournaments.length);
		const { visible, hasMore } = getPaginationState(tournaments, nextCount);

		expect(nextCount).toBe(10);
		expect(visible.length).toBe(10);
		expect(hasMore).toBe(false);
	});

	it("should support custom increments", () => {
		const tournaments = buildTournaments(12);
		const firstCount = 4;
		const nextCount = getNextVisibleCount(firstCount, 4, tournaments.length);
		const { visible, hasMore } = getPaginationState(tournaments, nextCount);

		expect(nextCount).toBe(8);
		expect(visible.length).toBe(8);
		expect(hasMore).toBe(true);
	});
});

// =============================================================================
// Formatting Tests
// =============================================================================

describe("PastTournamentsGrid closed date formatting", () => {
	it("should return placeholder when closed date is missing", () => {
		expect(formatClosedAt(null)).toBe("date unavailable");
	});

	it("should format a valid ISO date", () => {
		const formatted = formatClosedAt("2024-06-15T12:00:00.000Z");
		expect(formatted).toMatch(/^Jun \d{1,2}, 2024$/);
	});
});
