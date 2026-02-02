/**
 * Tournaments Page View Model Tests
 *
 * Validates filtering and mapping for active and past tournaments.
 */

import { describe, expect, it } from "vitest";

type TournamentStatus = "draft" | "active" | "archived";

interface TournamentRecord {
	id: number;
	slug: string;
	name: string;
	year: number;
	status: TournamentStatus;
	currentRoundNumber: number | null;
	closedAt: Date | null;
	uploadedByUser: { displayName: string };
}

interface PastTournamentView {
	id: number;
	slug: string;
	name: string;
	year: number;
	closedAt: string | null;
	uploadedBy: string;
}

function buildViewModel(tournaments: TournamentRecord[]) {
	const activeTournaments = tournaments.filter(
		(tournament) => tournament.status === "active",
	);
	const archivedTournaments = tournaments.filter(
		(tournament) => tournament.status === "archived",
	);
	const pastTournaments: PastTournamentView[] = archivedTournaments.map(
		(tournament) => ({
			id: tournament.id,
			slug: tournament.slug,
			name: tournament.name,
			year: tournament.year,
			closedAt: tournament.closedAt ? tournament.closedAt.toISOString() : null,
			uploadedBy: tournament.uploadedByUser.displayName,
		}),
	);

	return { activeTournaments, archivedTournaments, pastTournaments };
}

describe("tournaments page filtering", () => {
	it("should include archived tournaments in past list", () => {
		const tournaments: TournamentRecord[] = [
			{
				id: 1,
				slug: "active-1",
				name: "Active Tournament",
				year: 2024,
				status: "active",
				currentRoundNumber: 1,
				closedAt: null,
				uploadedByUser: { displayName: "Admin" },
			},
			{
				id: 2,
				slug: "archived-1",
				name: "Archived Tournament",
				year: 2023,
				status: "archived",
				currentRoundNumber: null,
				closedAt: new Date("2024-02-20T00:00:00.000Z"),
				uploadedByUser: { displayName: "Admin" },
			},
			{
				id: 3,
				slug: "draft-1",
				name: "Draft Tournament",
				year: 2024,
				status: "draft",
				currentRoundNumber: null,
				closedAt: null,
				uploadedByUser: { displayName: "Admin" },
			},
		];

		const { activeTournaments, archivedTournaments, pastTournaments } =
			buildViewModel(tournaments);

		expect(activeTournaments.length).toBe(1);
		expect(archivedTournaments.length).toBe(1);
		expect(pastTournaments.length).toBe(1);
		expect(pastTournaments[0]?.slug).toBe("archived-1");
		expect(pastTournaments[0]?.closedAt).toBe("2024-02-20T00:00:00.000Z");
	});

	it("should preserve null closedAt values", () => {
		const tournaments: TournamentRecord[] = [
			{
				id: 4,
				slug: "archived-2",
				name: "Archived Tournament 2",
				year: 2022,
				status: "archived",
				currentRoundNumber: null,
				closedAt: null,
				uploadedByUser: { displayName: "Admin" },
			},
		];

		const { pastTournaments } = buildViewModel(tournaments);

		expect(pastTournaments[0]?.closedAt).toBeNull();
	});
});
