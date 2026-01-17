import { ArrowLeft, Info } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";
import { api, HydrateClient } from "~/trpc/server";

export default async function TournamentLeaderboardPage({
	params,
}: {
	params: Promise<{ tournamentId: string }>;
}) {
	const { tournamentId } = await params;
	const id = Number.parseInt(tournamentId);

	const [tournament, leaderboard] = await Promise.all([
		api.tournaments.getById({ id }),
		api.leaderboards.getTournamentLeaderboard({ tournamentId: id }),
	]);

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

					{leaderboard.length === 0 ? (
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
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Rank</TableHead>
											<TableHead>Player</TableHead>
											<TableHead className="text-right">Points</TableHead>
											<TableHead className="text-right">
												Correct Winners
											</TableHead>
											<TableHead className="text-right">Exact Scores</TableHead>
											<TableHead className="text-right">
												Rounds Played
											</TableHead>
											<TableHead>First Submission</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{leaderboard.map((entry) => (
											<TableRow key={entry.userId}>
												<TableCell>
													<Badge
														className={cn(
															"flex h-8 w-8 items-center justify-center rounded-full font-bold",
															entry.rank === 1
																? "bg-yellow-500 hover:bg-yellow-600"
																: entry.rank === 2
																	? "bg-gray-400 hover:bg-gray-500"
																	: entry.rank === 3
																		? "bg-orange-600 hover:bg-orange-700"
																		: "bg-primary",
														)}
													>
														{entry.rank}
													</Badge>
												</TableCell>
												<TableCell>
													<div className="font-semibold">
														{entry.displayName}
													</div>
													<div className="text-muted-foreground text-sm">
														{entry.email}
													</div>
												</TableCell>
												<TableCell className="text-right">
													<div className="font-bold text-lg text-primary">
														{entry.totalPoints}
													</div>
												</TableCell>
												<TableCell className="text-right">
													{entry.correctWinners}
												</TableCell>
												<TableCell className="text-right">
													{entry.exactScores}
												</TableCell>
												<TableCell className="text-right">
													{entry.roundsPlayed}
												</TableCell>
												<TableCell className="text-sm">
													{new Date(entry.earliestSubmission).toLocaleString()}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
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
							</ul>
						</AlertDescription>
					</Alert>
				</main>
			</div>
		</HydrateClient>
	);
}
