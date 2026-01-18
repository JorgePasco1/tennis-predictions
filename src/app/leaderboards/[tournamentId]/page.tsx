import { ArrowLeft, Info } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { api, HydrateClient } from "~/trpc/server";
import { TournamentLeaderboardClient } from "./_components/TournamentLeaderboardClient";

export default async function TournamentLeaderboardPage({
	params,
}: {
	params: Promise<{ tournamentId: string }>;
}) {
	const { tournamentId } = await params;
	const id = Number.parseInt(tournamentId, 10);

	const [tournament, leaderboardData] = await Promise.all([
		api.tournaments.getById({ id }),
		api.leaderboards.getTournamentLeaderboard({ tournamentId: id }),
	]);

	const { entries, currentUserSubmittedRoundIds } = leaderboardData;

	return (
		<HydrateClient>
			<div className="min-h-screen bg-muted/30">
				<main className="container mx-auto px-4 py-8">
					<div className="mb-8">
						<Button asChild className="mb-4 -ml-4" variant="link">
							<Link href={`/tournaments/${tournament.slug}`}>
								<ArrowLeft className="mr-2 h-4 w-4" />
								Back to Tournament
							</Link>
						</Button>
						<h1 className="mb-2 font-bold text-4xl">Tournament Leaderboard</h1>
						<p className="text-muted-foreground">{tournament.name}</p>
					</div>

					{entries.length === 0 ? (
						<Card className="p-12 text-center">
							<div className="mb-4 text-6xl">🏆</div>
							<h2 className="mb-2 font-semibold text-2xl">No Rankings Yet</h2>
							<p className="text-muted-foreground">
								Rankings will appear once players submit picks
							</p>
						</Card>
					) : (
						<Card>
							<div className="overflow-x-auto">
								<TournamentLeaderboardClient
									currentUserSubmittedRoundIds={currentUserSubmittedRoundIds}
									entries={entries}
									tournamentId={id}
								/>
							</div>
						</Card>
					)}

					<Alert className="mt-8">
						<Info className="h-4 w-4" />
						<AlertTitle>Tournament Scoring</AlertTitle>
						<AlertDescription>
							<ul className="mt-2 space-y-1">
								<li>
									• Points are summed across all rounds in this tournament
								</li>
								<li>
									• Ties are broken by earliest submission time (first pick
									submitted wins)
								</li>
								<li>
									• Only rounds where you submitted picks count toward your
									total
								</li>
								<li>
									• Click on a player's name to compare picks (requires
									submitting your own picks first)
								</li>
							</ul>
						</AlertDescription>
					</Alert>
				</main>
			</div>
		</HydrateClient>
	);
}
