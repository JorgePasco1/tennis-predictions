"use client";

import { useState } from "react";
import {
	filterMatchesByPlayerName,
	SearchInput,
	SearchResultsCount,
} from "~/components/match-search";
import { Badge } from "~/components/ui/badge";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "~/components/ui/sheet";
import { Skeleton } from "~/components/ui/skeleton";
import { cn, formatDisplayName } from "~/lib/utils";
import { api } from "~/trpc/react";
import { RoundSelector } from "./RoundSelector";

interface PicksComparisonSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	tournamentId: number;
	otherUserId: string;
	otherUserDisplayName: string;
}

export function PicksComparisonSheet({
	open,
	onOpenChange,
	tournamentId,
	otherUserId,
	otherUserDisplayName,
}: PicksComparisonSheetProps) {
	const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
	const [searchQuery, setSearchQuery] = useState("");

	// Get common rounds where both users have submitted
	const { data: commonRounds, isLoading: isLoadingRounds } =
		api.picks.getCommonSubmittedRounds.useQuery(
			{ tournamentId, otherUserId },
			{ enabled: open },
		);

	// Auto-select most recent round when data loads
	const effectiveRoundId = selectedRoundId ?? commonRounds?.[0]?.id;

	// Get comparison data
	const { data: comparison, isLoading: isLoadingComparison } =
		api.picks.getPicksComparison.useQuery(
			{ roundId: effectiveRoundId!, otherUserId },
			{ enabled: open && effectiveRoundId != null },
		);

	// Filter matches by search query
	const filteredMatches = comparison
		? filterMatchesByPlayerName(
				comparison.matchComparisons.map((mc) => mc.match),
				searchQuery,
			)
		: [];

	const filteredComparisons = comparison
		? comparison.matchComparisons.filter((mc) =>
				filteredMatches.some((m) => m.id === mc.match.id),
			)
		: [];

	const isLoading = isLoadingRounds || isLoadingComparison;

	return (
		<Sheet onOpenChange={onOpenChange} open={open}>
			<SheetContent className="w-full overflow-y-auto sm:max-w-lg" side="right">
				<SheetHeader>
					<SheetTitle>
						Compare Picks with {formatDisplayName(otherUserDisplayName)}
					</SheetTitle>
					<SheetDescription>
						See how your picks compare match by match
					</SheetDescription>
				</SheetHeader>

				{isLoadingRounds ? (
					<div className="mt-4 space-y-4">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-32 w-full" />
					</div>
				) : commonRounds && commonRounds.length === 0 ? (
					<div className="mt-8 text-center">
						<p className="text-muted-foreground">
							No common rounds found. You both need to submit picks for the same
							round to compare.
						</p>
					</div>
				) : (
					<div className="mt-4 space-y-4">
						{/* Round selector */}
						{commonRounds && commonRounds.length > 1 && (
							<RoundSelector
								onRoundChange={setSelectedRoundId}
								rounds={commonRounds}
								selectedRoundId={effectiveRoundId ?? null}
							/>
						)}

						{/* Search */}
						<SearchInput
							onChange={setSearchQuery}
							placeholder="Search by player name..."
							value={searchQuery}
						/>

						{isLoadingComparison ? (
							<div className="space-y-4">
								<Skeleton className="h-32 w-full" />
								<Skeleton className="h-32 w-full" />
							</div>
						) : comparison ? (
							<>
								{/* Stats summary */}
								<div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4">
									<div className="text-center">
										<p className="text-muted-foreground text-sm">You</p>
										<p className="font-bold text-primary text-xl">
											{comparison.currentUserStats.totalPoints} pts
										</p>
										<p className="text-muted-foreground text-xs">
											{comparison.currentUserStats.correctWinners} correct /{" "}
											{comparison.currentUserStats.exactScores} exact
										</p>
									</div>
									<div className="text-center">
										<p className="text-muted-foreground text-sm">
											{formatDisplayName(otherUserDisplayName)}
										</p>
										<p className="font-bold text-primary text-xl">
											{comparison.otherUserStats.totalPoints} pts
										</p>
										<p className="text-muted-foreground text-xs">
											{comparison.otherUserStats.correctWinners} correct /{" "}
											{comparison.otherUserStats.exactScores} exact
										</p>
									</div>
								</div>

								{/* Search results count */}
								{searchQuery && (
									<SearchResultsCount
										filteredCount={filteredComparisons.length}
										searchQuery={searchQuery}
										totalCount={comparison.matchComparisons.length}
									/>
								)}

								{/* Match comparisons */}
								<div className="space-y-3">
									{filteredComparisons.map((mc) => (
										<MatchComparisonCard
											comparison={mc}
											key={mc.match.id}
											otherUserName={formatDisplayName(otherUserDisplayName)}
										/>
									))}
								</div>
							</>
						) : null}
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
}

interface MatchComparisonCardProps {
	comparison: {
		match: {
			id: number;
			matchNumber: number;
			player1Name: string;
			player2Name: string;
			player1Seed: number | null;
			player2Seed: number | null;
			winnerName: string | null;
			finalScore: string | null;
			status: "pending" | "finalized";
		};
		currentUserPick: {
			predictedWinner: string;
			predictedSetsWon: number;
			predictedSetsLost: number;
			isWinnerCorrect: boolean | null;
			isExactScore: boolean | null;
			pointsEarned: number;
		} | null;
		otherUserPick: {
			predictedWinner: string;
			predictedSetsWon: number;
			predictedSetsLost: number;
			isWinnerCorrect: boolean | null;
			isExactScore: boolean | null;
			pointsEarned: number;
		} | null;
		sameWinner: boolean;
		sameScore: boolean;
	};
	otherUserName: string;
}

function MatchComparisonCard({
	comparison,
	otherUserName,
}: MatchComparisonCardProps) {
	const { match, currentUserPick, otherUserPick, sameWinner, sameScore } =
		comparison;

	// Determine comparison status color
	let statusColor = "bg-muted";
	let statusText = "Different";

	if (sameScore) {
		statusColor = "bg-green-100 dark:bg-green-900/30";
		statusText = "Same pick";
	} else if (sameWinner) {
		statusColor = "bg-yellow-100 dark:bg-yellow-900/30";
		statusText = "Same winner";
	} else {
		statusColor = "bg-red-100 dark:bg-red-900/30";
		statusText = "Different";
	}

	const formatSeed = (seed: number | null) => (seed ? `[${seed}]` : "");

	return (
		<div className={cn("rounded-lg border p-3", statusColor)}>
			{/* Match header */}
			<div className="mb-3 flex items-center justify-between">
				<span className="text-muted-foreground text-xs">
					Match {match.matchNumber}
				</span>
				<Badge
					className={cn(
						"text-xs",
						sameScore
							? "bg-green-500"
							: sameWinner
								? "bg-yellow-500"
								: "bg-red-500",
					)}
					variant="secondary"
				>
					{statusText}
				</Badge>
			</div>

			{/* Players */}
			<div className="mb-3 text-center">
				<div className="font-semibold text-lg leading-tight">
					<span>
						{formatSeed(match.player1Seed)} {match.player1Name}
					</span>
					<span className="mx-2 text-muted-foreground">vs</span>
					<span>
						{formatSeed(match.player2Seed)} {match.player2Name}
					</span>
				</div>
			</div>

			{/* Picks comparison */}
			<div className="grid grid-cols-2 gap-2 text-sm">
				{/* Your pick */}
				<div className="rounded bg-background/50 p-2">
					<p className="mb-1 text-muted-foreground text-xs">You</p>
					{currentUserPick ? (
						<>
							<p className="font-medium">{currentUserPick.predictedWinner}</p>
							<p className="text-muted-foreground text-xs">
								{currentUserPick.predictedSetsWon}-
								{currentUserPick.predictedSetsLost}
							</p>
							{match.status === "finalized" && (
								<div className="mt-1">
									{currentUserPick.isExactScore ? (
										<Badge className="bg-green-500 text-xs" variant="secondary">
											+{currentUserPick.pointsEarned}
										</Badge>
									) : currentUserPick.isWinnerCorrect ? (
										<Badge className="bg-blue-500 text-xs" variant="secondary">
											+{currentUserPick.pointsEarned}
										</Badge>
									) : (
										<Badge className="text-xs" variant="outline">
											0
										</Badge>
									)}
								</div>
							)}
						</>
					) : (
						<p className="text-muted-foreground text-xs italic">No pick</p>
					)}
				</div>

				{/* Other user's pick */}
				<div className="rounded bg-background/50 p-2">
					<p className="mb-1 text-muted-foreground text-xs">{otherUserName}</p>
					{otherUserPick ? (
						<>
							<p className="font-medium">{otherUserPick.predictedWinner}</p>
							<p className="text-muted-foreground text-xs">
								{otherUserPick.predictedSetsWon}-
								{otherUserPick.predictedSetsLost}
							</p>
							{match.status === "finalized" && (
								<div className="mt-1">
									{otherUserPick.isExactScore ? (
										<Badge className="bg-green-500 text-xs" variant="secondary">
											+{otherUserPick.pointsEarned}
										</Badge>
									) : otherUserPick.isWinnerCorrect ? (
										<Badge className="bg-blue-500 text-xs" variant="secondary">
											+{otherUserPick.pointsEarned}
										</Badge>
									) : (
										<Badge className="text-xs" variant="outline">
											0
										</Badge>
									)}
								</div>
							)}
						</>
					) : (
						<p className="text-muted-foreground text-xs italic">No pick</p>
					)}
				</div>
			</div>

			{/* Actual result if finalized */}
			{match.status === "finalized" && match.winnerName && (
				<div className="mt-3 border-t pt-2 text-center text-xs">
					<span className="text-muted-foreground">Result: </span>
					<span className="font-medium">{match.winnerName}</span>
					{match.finalScore && (
						<span className="text-muted-foreground"> ({match.finalScore})</span>
					)}
				</div>
			)}
		</div>
	);
}
