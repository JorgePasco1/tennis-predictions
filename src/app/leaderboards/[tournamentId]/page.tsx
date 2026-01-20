import { redirect } from "next/navigation";
import { api } from "~/trpc/server";

export default async function TournamentLeaderboardPage({
	params,
}: {
	params: Promise<{ tournamentId: string }>;
}) {
	const { tournamentId } = await params;
	const id = Number.parseInt(tournamentId, 10);

	// Get tournament to get its slug
	const tournament = await api.tournaments.getById({ id });

	// Redirect to the tournament page with leaderboard tab
	redirect(`/tournaments/${tournament.slug}?tab=leaderboard`);
}
