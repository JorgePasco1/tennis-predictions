"use client";

import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { PicksComparisonSheet } from "~/components/picks-comparison";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn, formatDisplayName } from "~/lib/utils";

interface LeaderboardEntry {
	userId: string;
	displayName: string;
	imageUrl: string | null;
	totalPoints: number;
	correctWinners: number;
	exactScores: number;
	roundsPlayed: number;
	earliestSubmission: Date;
	rank: number;
}

interface TournamentLeaderboardClientProps {
	entries: LeaderboardEntry[];
	currentUserSubmittedRoundIds: number[];
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

export function TournamentLeaderboardClient({
	entries,
	currentUserSubmittedRoundIds,
	tournamentId,
}: TournamentLeaderboardClientProps) {
	const { userId } = useAuth();
	const [selectedUser, setSelectedUser] = useState<{
		id: string;
		displayName: string;
	} | null>(null);

	const hasSubmittedPicks = currentUserSubmittedRoundIds.length > 0;

	const handleUserClick = (entry: LeaderboardEntry) => {
		// Don't open comparison for yourself
		if (entry.userId === userId) return;

		// Only allow if user has submitted picks
		if (!hasSubmittedPicks) return;

		setSelectedUser({
			id: entry.userId,
			displayName: entry.displayName,
		});
	};

	return (
		<TooltipProvider>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Rank</TableHead>
						<TableHead>Player</TableHead>
						<TableHead className="text-right">Points</TableHead>
						<TableHead className="text-right">Correct Winners</TableHead>
						<TableHead className="text-right">Exact Scores</TableHead>
						<TableHead className="text-right">Rounds Played</TableHead>
						<TableHead>First Submission</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{entries.map((entry) => {
						const isCurrentUser = entry.userId === userId;
						const canCompare = hasSubmittedPicks && !isCurrentUser;

						return (
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
										{canCompare ? (
											<Button
												className="h-auto p-0 font-semibold"
												onClick={() => handleUserClick(entry)}
												variant="link"
											>
												{formatDisplayName(entry.displayName)}
											</Button>
										) : isCurrentUser ? (
											<span className="font-semibold">
												{formatDisplayName(entry.displayName)}{" "}
												<span className="text-muted-foreground text-xs">
													(you)
												</span>
											</span>
										) : (
											<Tooltip>
												<TooltipTrigger asChild>
													<span className="cursor-default font-semibold text-muted-foreground">
														{formatDisplayName(entry.displayName)}
													</span>
												</TooltipTrigger>
												<TooltipContent>
													<p>Submit your picks first to compare</p>
												</TooltipContent>
											</Tooltip>
										)}
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
						);
					})}
				</TableBody>
			</Table>

			{/* Picks comparison sheet */}
			{selectedUser && (
				<PicksComparisonSheet
					onOpenChange={(open) => {
						if (!open) setSelectedUser(null);
					}}
					open={true}
					otherUserDisplayName={selectedUser.displayName}
					otherUserId={selectedUser.id}
					tournamentId={tournamentId}
				/>
			)}
		</TooltipProvider>
	);
}
