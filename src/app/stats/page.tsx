import { Calendar, Target, TrendingUp, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { api, HydrateClient } from "~/trpc/server";

export default async function StatsPage() {
	const stats = await api.leaderboards.getUserStats();

	return (
		<HydrateClient>
			<div className="min-h-screen bg-muted/30">
				<main className="container mx-auto px-4 py-8">
					<div className="mb-8">
						<h1 className="mb-2 font-bold text-4xl">Your Statistics</h1>
						<p className="text-muted-foreground">
							Track your prediction performance and rankings
						</p>
					</div>

					{/* Overall Stats Cards */}
					<div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="font-medium text-sm">
									Total Points
								</CardTitle>
								<Trophy className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="font-bold text-2xl">
									{stats.overall.totalPoints}
								</div>
								<p className="text-muted-foreground text-xs">
									{stats.overall.rank
										? `Rank #${stats.overall.rank} of ${stats.overall.totalPlayers}`
										: "No ranking yet"}
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="font-medium text-sm">Accuracy</CardTitle>
								<Target className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="font-bold text-2xl">
									{stats.overall.accuracy.toFixed(1)}%
								</div>
								<p className="text-muted-foreground text-xs">
									{stats.overall.totalCorrectWinners} correct winners
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="font-medium text-sm">
									Exact Scores
								</CardTitle>
								<TrendingUp className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="font-bold text-2xl">
									{stats.overall.exactScoreRate.toFixed(1)}%
								</div>
								<p className="text-muted-foreground text-xs">
									{stats.overall.totalExactScores} exact predictions
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="font-medium text-sm">Activity</CardTitle>
								<Calendar className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="font-bold text-2xl">
									{stats.overall.tournamentsPlayed}
								</div>
								<p className="text-muted-foreground text-xs">
									{stats.overall.roundsPlayed} rounds played
								</p>
							</CardContent>
						</Card>
					</div>

					{/* Best Tournament Highlight */}
					{stats.bestTournament && (
						<Card className="mb-8 border-yellow-500 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Trophy className="h-5 w-5 text-yellow-600" />
									Best Tournament Performance
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="font-bold text-2xl text-yellow-900 dark:text-yellow-100">
									{stats.bestTournament.tournamentName}{" "}
									{stats.bestTournament.tournamentYear}
								</div>
								<div className="mt-2 flex flex-wrap gap-4 text-yellow-800 dark:text-yellow-200">
									<span>{stats.bestTournament.points} points</span>
									<span className="hidden sm:inline">-</span>
									<span>
										{stats.bestTournament.accuracy.toFixed(1)}% accuracy
									</span>
									<span className="hidden sm:inline">-</span>
									<span>{stats.bestTournament.roundsPlayed} rounds</span>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Tournament Breakdown */}
					<Card>
						<CardHeader>
							<CardTitle>Tournament Breakdown</CardTitle>
						</CardHeader>
						<CardContent>
							{stats.tournaments.length === 0 ? (
								<p className="py-8 text-center text-muted-foreground">
									No tournaments played yet. Start making predictions to see
									your stats!
								</p>
							) : (
								<div className="space-y-4">
									{stats.tournaments.map((tournament) => (
										<div
											className="flex items-center justify-between border-b pb-4 last:border-0"
											key={tournament.tournamentId}
										>
											<div>
												<div className="font-semibold">
													{tournament.tournamentName}{" "}
													{tournament.tournamentYear}
												</div>
												<div className="text-muted-foreground text-sm">
													{tournament.roundsPlayed} rounds -{" "}
													{tournament.predictions} predictions
												</div>
											</div>
											<div className="text-right">
												<div className="font-bold text-lg">
													{tournament.points} pts
												</div>
												<div className="text-muted-foreground text-sm">
													{tournament.accuracy.toFixed(1)}% accurate
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Recent Activity */}
					{stats.recentActivity.length > 0 && (
						<Card className="mt-8">
							<CardHeader>
								<CardTitle>Recent Activity</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									{stats.recentActivity.map((activity, index) => (
										<div
											className="flex items-center justify-between border-b pb-4 last:border-0"
											key={index}
										>
											<div>
												<div className="font-semibold">
													{activity.roundName}
												</div>
												<div className="text-muted-foreground text-sm">
													{activity.tournamentName} {activity.tournamentYear}
												</div>
												<div className="text-muted-foreground text-xs">
													{new Date(activity.submittedAt).toLocaleDateString(
														"en-US",
														{
															month: "short",
															day: "numeric",
															year: "numeric",
														},
													)}
												</div>
											</div>
											<div className="text-right">
												<div className="font-bold text-lg">
													{activity.totalPoints} pts
												</div>
												<div className="text-muted-foreground text-sm">
													{activity.correctWinners} correct
													{activity.exactScores > 0 &&
														` (${activity.exactScores} exact)`}
												</div>
											</div>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					)}
				</main>
			</div>
		</HydrateClient>
	);
}
