import { BarChart3, FileText, Trophy } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { api, HydrateClient } from "~/trpc/server";

export default async function TournamentDetailPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;

	let tournament;
	try {
		tournament = await api.tournaments.getBySlug({ slug });
	} catch {
		notFound();
	}

	const activeRound = tournament.rounds.find((r) => r.isActive);

	return (
		<HydrateClient>
			<div className="min-h-screen bg-muted/30">
				<main className="container mx-auto px-4 py-8">
					{/* Tournament Header */}
					<Card className="mb-8 border-none bg-gradient-to-br from-blue-500 to-blue-600 text-white">
						<CardHeader className="p-8">
							<CardTitle className="mb-2 text-4xl">{tournament.name}</CardTitle>
							<p className="text-blue-100">
								{tournament.year} • {tournament.status}
							</p>
							{tournament.atpUrl && (
								<p className="mt-2">
									<a
										className="inline-flex items-center gap-1 text-blue-100 underline hover:text-white"
										href={tournament.atpUrl}
										rel="noopener noreferrer"
										target="_blank"
									>
										View on ATP Tour ↗
									</a>
								</p>
							)}
							{tournament.currentRoundNumber && (
								<p className="mt-2 text-lg">
									Current Round: {tournament.currentRoundNumber}
								</p>
							)}
						</CardHeader>
					</Card>

					{/* Active Round Alert */}
					{activeRound && (
						<Alert className="mb-8 border-green-500 bg-green-50">
							<AlertTitle className="text-2xl text-green-900">
								{activeRound.name} - Picks Now Open!
							</AlertTitle>
							<AlertDescription className="text-green-800">
								Submit your predictions for this round before it closes
							</AlertDescription>
							<Button
								asChild
								className="col-start-2 mt-4 bg-green-600 hover:bg-green-700"
							>
								<Link href={`/tournaments/${slug}/picks`}>Submit Picks</Link>
							</Button>
						</Alert>
					)}

					{/* Rounds Overview */}
					<div className="mb-8">
						<h2 className="mb-4 font-bold text-2xl">Rounds</h2>
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
							{tournament.rounds.map((round) => (
								<Card
									className={cn(
										round.isActive
											? "border-green-500 bg-green-50"
											: round.isFinalized
												? "bg-muted"
												: "",
									)}
									key={round.id}
								>
									<CardContent className="p-6">
										<div className="mb-2 flex items-center justify-between">
											<h3 className="font-semibold text-lg">{round.name}</h3>
											{round.isActive && (
												<Badge className="bg-green-600 hover:bg-green-700">
													Active
												</Badge>
											)}
											{round.isFinalized && (
												<Badge variant="secondary">Finalized</Badge>
											)}
										</div>
										<p className="mb-4 text-muted-foreground text-sm">
											{round.matches.length} matches
										</p>
										{round.scoringRule && (
											<p className="text-muted-foreground text-sm">
												Scoring: {round.scoringRule.pointsPerWinner} pts/winner,
												+{round.scoringRule.pointsExactScore} for exact score
											</p>
										)}
									</CardContent>
								</Card>
							))}
						</div>
					</div>

					{/* Quick Links */}
					<div className="grid gap-4 md:grid-cols-3">
						<Link className="group" href={`/tournaments/${slug}/picks`}>
							<Card className="transition-shadow hover:shadow-md">
								<CardContent className="p-6">
									<FileText className="mb-2 h-8 w-8 text-primary" />
									<h3 className="mb-2 font-semibold text-lg">Your Picks</h3>
									<p className="text-muted-foreground text-sm">
										View or submit your predictions
									</p>
								</CardContent>
							</Card>
						</Link>
						<Link className="group" href={`/tournaments/${slug}/results`}>
							<Card className="transition-shadow hover:shadow-md">
								<CardContent className="p-6">
									<BarChart3 className="mb-2 h-8 w-8 text-primary" />
									<h3 className="mb-2 font-semibold text-lg">Results</h3>
									<p className="text-muted-foreground text-sm">
										View match results and your scores
									</p>
								</CardContent>
							</Card>
						</Link>
						<Link className="group" href={`/leaderboards/${tournament.id}`}>
							<Card className="transition-shadow hover:shadow-md">
								<CardContent className="p-6">
									<Trophy className="mb-2 h-8 w-8 text-primary" />
									<h3 className="mb-2 font-semibold text-lg">Leaderboard</h3>
									<p className="text-muted-foreground text-sm">
										See tournament rankings
									</p>
								</CardContent>
							</Card>
						</Link>
					</div>
				</main>
			</div>
		</HydrateClient>
	);
}
