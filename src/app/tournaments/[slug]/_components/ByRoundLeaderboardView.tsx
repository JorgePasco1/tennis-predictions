"use client";

import { useAuth } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
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
import { api } from "~/trpc/react";
import { LeaderboardProgressionChart } from "./LeaderboardProgressionChart";

interface ByRoundLeaderboardViewProps {
	tournamentId: number;
}

function getInitials(displayName: string): string {
	const parts = displayName.trim().split(/\s+/);
	if (parts.length === 1) return parts[0]?.[0]?.toUpperCase() ?? "?";
	return (
		(parts[0]?.[0]?.toUpperCase() ?? "") +
		(parts[parts.length - 1]?.[0]?.toUpperCase() ?? "")
	);
}

export function ByRoundLeaderboardView({
	tournamentId,
}: ByRoundLeaderboardViewProps) {
	const { userId } = useAuth();

	const { data, isLoading, error } =
		api.leaderboards.getPerRoundLeaderboard.useQuery({
			tournamentId,
		});

	if (isLoading) {
		return (
			<Card className="p-12 text-center">
				<div className="text-muted-foreground">Loading per-round data...</div>
			</Card>
		);
	}

	if (error) {
		return (
			<Card className="p-12 text-center">
				<div className="text-destructive">
					Error loading per-round data: {error.message}
				</div>
			</Card>
		);
	}

	if (!data || data.userRoundData.length === 0) {
		return (
			<Card className="p-12 text-center">
				<div className="mb-4 text-6xl">📊</div>
				<h2 className="mb-2 font-semibold text-2xl">No Data Yet</h2>
				<p className="text-muted-foreground">
					Per-round breakdown will appear once players submit picks
				</p>
			</Card>
		);
	}

	const { rounds, userRoundData } = data;

	return (
		<div className="space-y-6">
			{/* Chart Card */}
			<Card className="p-4">
				<div className="mb-4">
					<h3 className="font-semibold text-lg">Points Progression</h3>
					<p className="text-muted-foreground text-sm">
						Top {Math.min(10, userRoundData.length)} users' cumulative points
						across rounds
					</p>
				</div>
				<LeaderboardProgressionChart
					rounds={rounds}
					topN={10}
					userRoundData={userRoundData}
				/>
			</Card>

			{/* Per-Round Table Card */}
			<Card>
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Round</TableHead>
								<TableHead>Rank</TableHead>
								<TableHead>Player</TableHead>
								<TableHead className="text-right">Round Points</TableHead>
								<TableHead className="text-right">Cumulative</TableHead>
								<TableHead className="text-right">Overall Rank</TableHead>
								<TableHead className="text-right">Correct</TableHead>
								<TableHead className="text-right">Exact</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rounds.map((round, roundIndex) => {
								// For each round, show all users
								const usersInRound = userRoundData
									.filter((user) => {
										const roundData = user.rounds.find(
											(r) => r.roundId === round.roundId,
										);
										return roundData?.hasSubmitted;
									})
									.sort((a, b) => {
										const aRound = a.rounds.find(
											(r) => r.roundId === round.roundId,
										);
										const bRound = b.rounds.find(
											(r) => r.roundId === round.roundId,
										);
										// Sort by round rank
										if (aRound?.rank && bRound?.rank) {
											return aRound.rank - bRound.rank;
										}
										return 0;
									});

								return usersInRound.map((user, index) => {
									const roundData = user.rounds.find(
										(r) => r.roundId === round.roundId,
									);
									const isCurrentUser = user.userId === userId;
									const isFirstInRound = index === 0;
									const isRoundDivider = isFirstInRound && roundIndex > 0;

									if (!roundData || !roundData.hasSubmitted) return null;

									return (
										<TableRow
											className={cn(
												isCurrentUser && "bg-muted/50",
												isRoundDivider && "border-t-2 border-t-gray-400",
											)}
											key={`${round.roundId}-${user.userId}`}
										>
											{/* Round Name - only show for first user in each round */}
											{isFirstInRound ? (
												<TableCell
													className="font-medium"
													rowSpan={usersInRound.length}
												>
													<div className="flex flex-col">
														<span>{round.roundName}</span>
														{!round.isFinalized && (
															<Badge
																className="mt-1 w-fit text-xs"
																variant="outline"
															>
																In Progress
															</Badge>
														)}
													</div>
												</TableCell>
											) : null}

											{/* Round Rank */}
											<TableCell>
												<Badge
													className={cn(
														"flex h-8 w-8 items-center justify-center rounded-full font-bold",
														roundData.rank === 1
															? "bg-yellow-500 hover:bg-yellow-600"
															: roundData.rank === 2
																? "bg-gray-400 hover:bg-gray-500"
																: roundData.rank === 3
																	? "bg-orange-600 hover:bg-orange-700"
																	: "bg-primary",
													)}
												>
													{roundData.rank}
												</Badge>
											</TableCell>

											{/* Player */}
											<TableCell>
												<div className="flex items-center gap-3">
													<Avatar className="size-8">
														{user.imageUrl && (
															<AvatarImage
																alt={user.displayName}
																src={user.imageUrl}
															/>
														)}
														<AvatarFallback className="text-xs">
															{getInitials(user.displayName)}
														</AvatarFallback>
													</Avatar>
													<span
														className={cn(
															"text-sm",
															isCurrentUser && "font-semibold",
														)}
													>
														{formatDisplayName(user.displayName)}
														{isCurrentUser && (
															<span className="text-muted-foreground text-xs">
																{" "}
																(you)
															</span>
														)}
													</span>
												</div>
											</TableCell>

											{/* Round Points */}
											<TableCell className="text-right">
												<span className="font-semibold">
													{roundData.totalPoints}
												</span>
											</TableCell>

											{/* Cumulative Points */}
											<TableCell className="text-right">
												<span className="font-bold text-primary">
													{roundData.cumulativePoints}
												</span>
											</TableCell>

											{/* Overall Rank */}
											<TableCell className="text-right">
												<Badge
													className={cn(
														"h-6 w-6 rounded-full",
														roundData.cumulativeRank === 1
															? "bg-yellow-500 hover:bg-yellow-600"
															: roundData.cumulativeRank === 2
																? "bg-gray-400 hover:bg-gray-500"
																: roundData.cumulativeRank === 3
																	? "bg-orange-600 hover:bg-orange-700"
																	: "bg-primary",
													)}
													variant="default"
												>
													{roundData.cumulativeRank}
												</Badge>
											</TableCell>

											{/* Correct Winners */}
											<TableCell className="text-right text-sm">
												{roundData.correctWinners}
											</TableCell>

											{/* Exact Scores */}
											<TableCell className="text-right text-sm">
												{roundData.exactScores}
											</TableCell>
										</TableRow>
									);
								});
							})}
						</TableBody>
					</Table>
				</div>
			</Card>
		</div>
	);
}
