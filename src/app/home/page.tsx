import {
	BarChart3,
	CalendarClock,
	Home,
	Target,
	TrendingUp,
	Trophy,
} from "lucide-react";
import Link from "next/link";
import { CountdownTimerCompact } from "~/components/countdown/CountdownTimer";
import { StreakCard } from "~/components/streaks/StreakDisplay";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { api, HydrateClient } from "~/trpc/server";

export default async function HomePage() {
	const [upcomingDeadlines, userStreak, topStreaks, userStats] =
		await Promise.all([
			api.schedule.getUpcomingDeadlines({ limit: 10 }),
			api.schedule.getUserStreak(),
			api.schedule.getTopStreaks({ limit: 5 }),
			api.leaderboards.getUserStats(),
		]);

	// Group deadlines by tournament
	const groupedByTournament = upcomingDeadlines.reduce(
		(acc, round) => {
			const key = round.tournament.id;
			if (!acc[key]) {
				acc[key] = {
					tournament: round.tournament,
					rounds: [],
				};
			}
			acc[key].rounds.push(round);
			return acc;
		},
		{} as Record<
			number,
			{
				tournament: (typeof upcomingDeadlines)[0]["tournament"];
				rounds: typeof upcomingDeadlines;
			}
		>,
	);

	const hasNoTournaments = userStats.tournaments.length === 0;

	return (
		<HydrateClient>
			<div className="min-h-screen bg-muted/30">
				<main className="container mx-auto px-4 py-8">
					{/* Header */}
					<div className="mb-8">
						<h1 className="mb-2 flex items-center gap-2 font-bold text-4xl">
							<Home className="h-10 w-10" />
							Home
						</h1>
						<p className="text-muted-foreground">
							Your prediction dashboard - track deadlines, stats, and streaks
						</p>
					</div>

					{/* Quick Stats Row */}
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
									{userStats.overall.totalPoints}
								</div>
								<p className="text-muted-foreground text-xs">
									{userStats.overall.rank
										? `Rank #${userStats.overall.rank} of ${userStats.overall.totalPlayers}`
										: "No ranking yet"}
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="font-medium text-sm">
									All-Time Rank
								</CardTitle>
								<BarChart3 className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="font-bold text-2xl">
									{userStats.overall.rank ? `#${userStats.overall.rank}` : "-"}
								</div>
								<p className="text-muted-foreground text-xs">
									{userStats.overall.totalPlayers > 0
										? `of ${userStats.overall.totalPlayers} players`
										: "Start predicting to get ranked"}
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
									{userStats.overall.accuracy.toFixed(1)}%
								</div>
								<p className="text-muted-foreground text-xs">
									{userStats.overall.totalCorrectWinners} correct winners
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="font-medium text-sm">
									Current Streak
								</CardTitle>
								<TrendingUp className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="font-bold text-2xl">
									{userStreak.currentStreak > 0
										? `${userStreak.currentStreak >= 10 ? "🔥" : userStreak.currentStreak >= 5 ? "⚡" : "✨"} ${userStreak.currentStreak}`
										: "0"}
								</div>
								<p className="text-muted-foreground text-xs">
									{userStreak.currentStreak > 0
										? `Best: ${userStreak.longestStreak}`
										: "Start predicting to build your streak"}
								</p>
							</CardContent>
						</Card>
					</div>

					<div className="grid gap-8 lg:grid-cols-3">
						{/* Main content - upcoming deadlines */}
						<div className="lg:col-span-2">
							<h2 className="mb-4 flex items-center gap-2 font-semibold text-xl">
								<CalendarClock className="h-5 w-5" />
								Upcoming Deadlines
							</h2>

							{Object.keys(groupedByTournament).length === 0 ? (
								<Card>
									<CardContent className="p-12 text-center">
										<div className="mb-4 text-6xl">-</div>
										<h3 className="mb-2 font-semibold text-xl">
											All Caught Up!
										</h3>
										<p className="text-muted-foreground">
											No pending deadlines at the moment.
										</p>
									</CardContent>
								</Card>
							) : (
								<div className="space-y-6">
									{Object.values(groupedByTournament).map(
										({ tournament, rounds }) => (
											<Card key={tournament.id}>
												<CardHeader className="pb-2">
													<CardTitle className="flex items-center justify-between">
														<Link
															className="transition-colors hover:text-primary"
															href={`/tournaments/${tournament.slug}`}
														>
															{tournament.name}
														</Link>
														<Badge variant="outline">
															{rounds.length} round
															{rounds.length !== 1 ? "s" : ""}
														</Badge>
													</CardTitle>
												</CardHeader>
												<CardContent>
													<div className="divide-y">
														{rounds.map((round) => (
															<div
																className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
																key={round.id}
															>
																<div>
																	<div className="flex items-center gap-2">
																		<span className="font-medium">
																			{round.name}
																		</span>
																		{round.isActive &&
																			!round.submissionsClosedAt && (
																				<Badge className="bg-green-600">
																					Active
																				</Badge>
																			)}
																		{round.isActive &&
																			round.submissionsClosedAt && (
																				<Badge variant="secondary">
																					Closed
																				</Badge>
																			)}
																	</div>
																	{round.opensAt && !round.isActive && (
																		<p className="text-muted-foreground text-sm">
																			Opens:{" "}
																			{new Date(round.opensAt).toLocaleString(
																				undefined,
																				{
																					weekday: "short",
																					month: "short",
																					day: "numeric",
																					hour: "numeric",
																					minute: "2-digit",
																				},
																			)}
																		</p>
																	)}
																</div>
																<div className="flex items-center gap-4">
																	{round.deadline &&
																		!round.submissionsClosedAt && (
																			<div className="flex flex-col items-end gap-1">
																				<span className="text-muted-foreground text-xs">
																					Deadline
																				</span>
																				<CountdownTimerCompact
																					deadline={round.deadline}
																					opensAt={round.opensAt}
																				/>
																			</div>
																		)}
																	{round.isActive &&
																		!round.submissionsClosedAt && (
																			<Link
																				className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90"
																				href={`/tournaments/${tournament.slug}/picks`}
																			>
																				Submit Picks
																			</Link>
																		)}
																</div>
															</div>
														))}
													</div>
												</CardContent>
											</Card>
										),
									)}
								</div>
							)}
						</div>

						{/* Right sidebar */}
						<div className="space-y-6">
							{/* Your Tournaments */}
							<div>
								<h2 className="mb-4 flex items-center gap-2 font-semibold text-xl">
									<Trophy className="h-5 w-5" />
									Your Tournaments
								</h2>
								{hasNoTournaments ? (
									<Card>
										<CardContent className="p-6 text-center">
											<p className="mb-4 text-muted-foreground">
												Join a tournament to get started!
											</p>
											<Button asChild>
												<Link href="/tournaments">Browse Tournaments</Link>
											</Button>
										</CardContent>
									</Card>
								) : (
									<div className="space-y-3">
										{userStats.tournaments.slice(0, 5).map((tournament) => (
											<Card key={tournament.tournamentId}>
												<CardContent className="p-4">
													<div className="flex items-center justify-between">
														<div>
															<div className="font-semibold">
																{tournament.tournamentName}
															</div>
															<div className="text-muted-foreground text-sm">
																{tournament.tournamentYear}
															</div>
														</div>
														<div className="text-right">
															<div className="font-bold">
																{tournament.points} pts
															</div>
															<div className="text-muted-foreground text-xs">
																{tournament.accuracy.toFixed(0)}% accurate
															</div>
														</div>
													</div>
												</CardContent>
											</Card>
										))}
									</div>
								)}
							</div>

							{/* Quick Actions */}
							<div>
								<h2 className="mb-4 font-semibold text-xl">Quick Actions</h2>
								<div className="flex flex-col gap-2">
									<Button asChild className="justify-start" variant="outline">
										<Link href="/tournaments">
											<Trophy className="mr-2 h-4 w-4" />
											Browse Tournaments
										</Link>
									</Button>
									<Button asChild className="justify-start" variant="outline">
										<Link href="/leaderboards">
											<BarChart3 className="mr-2 h-4 w-4" />
											View Leaderboards
										</Link>
									</Button>
									<Button asChild className="justify-start" variant="outline">
										<Link href="/stats">
											<TrendingUp className="mr-2 h-4 w-4" />
											Your Full Stats
										</Link>
									</Button>
								</div>
							</div>

							{/* User's streak */}
							<div>
								<h2 className="mb-4 font-semibold text-xl">Your Streak</h2>
								<StreakCard
									currentStreak={userStreak.currentStreak}
									longestStreak={userStreak.longestStreak}
								/>
							</div>

							{/* Top streaks leaderboard */}
							{topStreaks.length > 0 && (
								<Card>
									<CardHeader>
										<CardTitle className="flex items-center gap-2 text-lg">
											<Trophy className="h-5 w-5" />
											Top Streaks
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="space-y-3">
											{topStreaks.map((streak, index) => (
												<div
													className="flex items-center justify-between"
													key={streak.userId}
												>
													<div className="flex items-center gap-3">
														<span
															className={cn(
																"flex h-6 w-6 items-center justify-center rounded-full font-semibold text-sm",
																index === 0
																	? "bg-yellow-100 text-yellow-700"
																	: index === 1
																		? "bg-gray-100 text-gray-700"
																		: index === 2
																			? "bg-orange-100 text-orange-700"
																			: "bg-muted text-muted-foreground",
															)}
														>
															{index + 1}
														</span>
														<span className="font-medium">
															{streak.displayName}
														</span>
													</div>
													<span className="font-mono font-semibold text-orange-500">
														{streak.currentStreak >= 10 ? "🔥" : ""}
														{streak.currentStreak >= 5 &&
														streak.currentStreak < 10
															? "⚡"
															: ""}
														{streak.currentStreak}
													</span>
												</div>
											))}
										</div>
									</CardContent>
								</Card>
							)}
						</div>
					</div>
				</main>
			</div>
		</HydrateClient>
	);
}
