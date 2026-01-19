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

	const { entries, currentUserSubmittedRoundIds, tournamentStats } =
		leaderboardData;

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

					{/* Tournament Progress */}
					{tournamentStats.totalMatches > 0 && (
						<Card className="mb-6 p-4">
							<div className="flex flex-wrap items-center justify-between gap-4">
								<div className="flex flex-wrap gap-6">
									<div>
										<div className="font-semibold text-2xl">
											{tournamentStats.finalizedMatches}/
											{tournamentStats.totalMatches}
										</div>
										<div className="text-muted-foreground text-sm">
											Matches Played
										</div>
									</div>
									<div>
										<div className="font-semibold text-2xl">
											{tournamentStats.maxPossiblePoints}
										</div>
										<div className="text-muted-foreground text-sm">
											Max Possible Points
										</div>
									</div>
									<div>
										<div className="font-semibold text-2xl">
											{tournamentStats.totalMatches > 0
												? Math.round(
														(tournamentStats.finalizedMatches /
															tournamentStats.totalMatches) *
															100,
													)
												: 0}
											%
										</div>
										<div className="text-muted-foreground text-sm">
											Complete
										</div>
									</div>
								</div>
							</div>
						</Card>
					)}

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
						<AlertTitle>How Scoring Works</AlertTitle>
						<AlertDescription>
							<div className="mt-2 space-y-3">
								<p className="text-sm">
									Earn points by predicting match winners correctly. Get a bonus
									for predicting the exact score.
								</p>
								<div className="rounded border bg-muted/50 p-3">
									<div className="mb-2 font-medium text-sm">
										Points per match:
									</div>
									<ul className="space-y-1 text-sm">
										<li>
											• R128 – QF: <strong>10</strong> pts/winner, +
											<strong>5</strong> exact score
										</li>
										<li>
											• Semi Finals: <strong>12</strong> pts/winner, +
											<strong>6</strong> exact score
										</li>
										<li>
											• Final: <strong>15</strong> pts/winner, +
											<strong>8</strong> exact score
										</li>
									</ul>
								</div>
								<ul className="space-y-1 text-muted-foreground text-sm">
									<li>• Ties broken by earliest submission time</li>
									<li>• Click a player's name to compare picks</li>
								</ul>
							</div>
						</AlertDescription>
					</Alert>
				</main>
			</div>
		</HydrateClient>
	);
}
