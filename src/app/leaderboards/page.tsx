import { Info, Trophy } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
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
import { cn, formatDisplayName } from "~/lib/utils";
import { api, HydrateClient } from "~/trpc/server";

function getInitials(displayName: string): string {
	const parts = displayName.trim().split(/\s+/);
	if (parts.length === 1) return parts[0]?.[0]?.toUpperCase() ?? "?";
	return (
		(parts[0]?.[0]?.toUpperCase() ?? "") +
		(parts[parts.length - 1]?.[0]?.toUpperCase() ?? "")
	);
}

export default async function AllTimeLeaderboardPage() {
	const data = await api.leaderboards.getAllTimeLeaderboard();
	const { leaderboard, activeTournaments } = data;

	return (
		<HydrateClient>
			<div className="min-h-screen bg-muted/30">
				<main className="container mx-auto px-4 py-8">
					<div className="mb-8">
						<h1 className="mb-2 font-bold text-4xl">All-Time Leaderboard</h1>
						<p className="text-muted-foreground">
							Top predictors across all tournaments
						</p>
					</div>

					{/* Active Tournament Links */}
					{activeTournaments.length > 0 && (
						<Card className="mb-8 p-6">
							<div className="mb-4 flex items-center gap-2">
								<Trophy className="h-5 w-5 text-primary" />
								<h2 className="font-semibold text-lg">Active Tournaments</h2>
							</div>
							<div className="flex flex-wrap gap-3">
								{activeTournaments.map((tournament) => (
									<Button asChild key={tournament.id} variant="outline">
										<Link href={`/leaderboards/${tournament.id}`}>
											{tournament.name} {tournament.year}
										</Link>
									</Button>
								))}
							</div>
						</Card>
					)}

					{leaderboard.length === 0 ? (
						<Card className="p-12 text-center">
							<div className="mb-4 text-6xl">🏆</div>
							<h2 className="mb-2 font-semibold text-2xl">No Rankings Yet</h2>
							<p className="text-muted-foreground">
								Leaderboard will appear once tournaments have results
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
											<TableHead className="text-right">Correct</TableHead>
											<TableHead className="text-right">Exact</TableHead>
											<TableHead className="text-right">Rounds</TableHead>
											<TableHead>Member Since</TableHead>
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
													<div className="flex items-center gap-3">
														<Avatar className="size-8">
															{entry.imageUrl && (
																<AvatarImage
																	alt={entry.displayName}
																	src={entry.imageUrl}
																/>
															)}
															<AvatarFallback className="text-xs">
																{getInitials(entry.displayName)}
															</AvatarFallback>
														</Avatar>
														<span className="font-semibold">
															{formatDisplayName(entry.displayName)}
														</span>
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
													{new Date(entry.memberSince).toLocaleDateString()}
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
						<AlertTitle>How Rankings Work</AlertTitle>
						<AlertDescription>
							<ul className="mt-2 space-y-1">
								<li>
									• Players are ranked by total points across all tournaments
								</li>
								<li>
									• Ties are broken by account creation date (earlier is better)
								</li>
								<li>
									• Secondary tie-breaker is earliest submission time across all
									picks
								</li>
							</ul>
						</AlertDescription>
					</Alert>
				</main>
			</div>
		</HydrateClient>
	);
}
