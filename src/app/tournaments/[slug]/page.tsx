import { BarChart3, FileText, Trophy } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CountdownTimer } from "~/components/countdown/CountdownTimer";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { api, HydrateClient } from "~/trpc/server";
import { TournamentTabs } from "./_components/TournamentTabs";

export default async function TournamentDetailPage({
	params,
	searchParams,
}: {
	params: Promise<{ slug: string }>;
	searchParams: Promise<{ tab?: string }>;
}) {
	const { slug } = await params;
	const { tab } = await searchParams;

	let tournament;
	try {
		tournament = await api.tournaments.getBySlug({ slug });
	} catch {
		notFound();
	}

	const activeRound = tournament.rounds.find((r) => r.isActive);

	// Fetch data for both tabs in parallel
	const [userPicks, leaderboardData, roundsWithPicks] = await Promise.all([
		// User's picks for active round (for button text)
		activeRound
			? api.picks
					.getUserRoundPicks({ roundId: activeRound.id })
					.catch(() => null)
			: Promise.resolve(null),
		// Leaderboard data
		api.leaderboards
			.getTournamentLeaderboard({ tournamentId: tournament.id })
			.catch(() => ({
				entries: [],
				currentUserSubmittedRoundIds: [],
				tournamentStats: {
					totalMatches: 0,
					finalizedMatches: 0,
					maxPossiblePoints: 0,
					rounds: [],
				},
			})),
		// Results with user picks for bracket
		api.results
			.getTournamentResultsWithUserPicks({ tournamentId: tournament.id })
			.catch(() => []),
	]);

	// Determine button text based on pick status
	const getPicksButtonText = () => {
		if (!userPicks) return "Submit Picks";
		if (userPicks.isDraft) return "Continue Picking";
		return "View My Picks";
	};

	// Transform rounds data for bracket display
	const bracketRounds = roundsWithPicks.map((round) => ({
		id: round.id,
		name: round.name,
		roundNumber: round.roundNumber,
		isFinalized: round.isFinalized ?? false,
		isActive: round.isActive ?? false,
		matches: round.matches.map((match) => ({
			id: match.id,
			matchNumber: match.matchNumber,
			player1Name: match.player1Name,
			player2Name: match.player2Name,
			player1Seed: match.player1Seed,
			player2Seed: match.player2Seed,
			status: match.status,
			winnerName: match.winnerName,
			finalScore: match.finalScore,
			isRetirement: match.isRetirement,
			userPick: match.userPick,
		})),
	}));

	const defaultTab = tab === "leaderboard" ? "leaderboard" : "bracket";

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
						<Alert
							className={cn(
								"mb-8",
								activeRound.submissionsClosedAt
									? "border-yellow-500 bg-yellow-50"
									: "border-green-500 bg-green-50",
							)}
						>
							<AlertTitle
								className={cn(
									"text-2xl",
									activeRound.submissionsClosedAt
										? "text-yellow-900"
										: "text-green-900",
								)}
							>
								{activeRound.name} -{" "}
								{activeRound.submissionsClosedAt
									? "Submissions Closed"
									: "Picks Now Open!"}
							</AlertTitle>
							<AlertDescription
								className={
									activeRound.submissionsClosedAt
										? "text-yellow-800"
										: "text-green-800"
								}
							>
								{activeRound.submissionsClosedAt ? (
									<>
										Submissions for this round were closed on{" "}
										{new Date(activeRound.submissionsClosedAt).toLocaleString()}
										.
										{userPicks &&
											!userPicks.isDraft &&
											" You can view your submitted picks."}
									</>
								) : (
									<div className="flex flex-col gap-2">
										<span>
											Submit your predictions for this round before it closes
										</span>
										{activeRound.deadline && (
											<CountdownTimer
												className="mt-2"
												deadline={activeRound.deadline}
												opensAt={activeRound.opensAt}
											/>
										)}
									</div>
								)}
							</AlertDescription>
							<Button
								asChild
								className={cn(
									"col-start-2 mt-4",
									activeRound.submissionsClosedAt
										? "bg-gray-600 hover:bg-gray-700"
										: "bg-green-600 hover:bg-green-700",
								)}
							>
								<Link href={`/tournaments/${slug}/picks`}>
									{activeRound.submissionsClosedAt
										? userPicks && !userPicks.isDraft
											? "View My Picks"
											: "View Round"
										: getPicksButtonText()}
								</Link>
							</Button>
						</Alert>
					)}

					{/* Bracket & Leaderboard Tabs */}
					<TournamentTabs
						bracketRounds={bracketRounds}
						currentUserSubmittedRoundIds={
							leaderboardData.currentUserSubmittedRoundIds
						}
						defaultTab={defaultTab}
						leaderboardEntries={leaderboardData.entries}
						tournamentId={tournament.id}
						tournamentStats={leaderboardData.tournamentStats}
					/>

					{/* Quick Links */}
					<div
						className={cn(
							"mt-8 grid gap-4",
							tournament.closedAt ? "md:grid-cols-3" : "md:grid-cols-2",
						)}
					>
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
						{tournament.closedAt && (
							<Link className="group" href={`/tournaments/${slug}/summary`}>
								<Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 transition-shadow hover:shadow-md">
									<CardContent className="p-6">
										<Trophy className="mb-2 h-8 w-8 text-amber-500" />
										<h3 className="mb-2 font-semibold text-lg">
											Tournament Summary
										</h3>
										<p className="text-muted-foreground text-sm">
											View final standings, top performers & fun stats
										</p>
									</CardContent>
								</Card>
							</Link>
						)}
					</div>
				</main>
			</div>
		</HydrateClient>
	);
}
