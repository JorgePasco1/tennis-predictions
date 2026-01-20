"use client";

import { cn } from "~/lib/utils";
import type { MatchData } from "./BracketMatch";

interface MobileMatchCardProps {
	match: MatchData;
	onClick?: (matchId: number) => void;
}

function truncate(text: string, maxLength: number): string {
	return text.length > maxLength
		? `${text.substring(0, maxLength - 1)}…`
		: text;
}

function getPlayerScore(
	match: MatchData,
	playerNumber: 1 | 2,
): string | undefined {
	if (match.status !== "finalized") return undefined;

	const isPlayer1Winner = match.winnerName === match.player1Name;
	const isPlayer2Winner = match.winnerName === match.player2Name;

	// Parse "3-0" into [winnerSets, loserSets]
	const scoreParts = match.finalScore?.split("-").map(Number) ?? [];
	const [winnerSets, loserSets] =
		scoreParts.length === 2 ? scoreParts : [undefined, undefined];

	if (playerNumber === 1) {
		if (match.isRetirement && !isPlayer1Winner) return "Ret";
		return isPlayer1Winner ? winnerSets?.toString() : loserSets?.toString();
	} else {
		if (match.isRetirement && !isPlayer2Winner) return "Ret";
		return isPlayer2Winner ? winnerSets?.toString() : loserSets?.toString();
	}
}

export function MobileMatchCard({ match, onClick }: MobileMatchCardProps) {
	const isClickable = !!onClick;
	const isFinalized = match.status === "finalized";
	const isPlayer1Winner = match.winnerName === match.player1Name;
	const isPlayer2Winner = match.winnerName === match.player2Name;

	return (
		<div
			className={cn(
				"rounded-lg border-2 bg-card",
				isClickable &&
					"cursor-pointer transition-colors hover:border-primary/50",
			)}
			onClick={isClickable ? () => onClick(match.id) : undefined}
			onKeyDown={(e) => {
				if (!isClickable) return;
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onClick?.(match.id);
				}
			}}
			role={isClickable ? "button" : undefined}
			tabIndex={isClickable ? 0 : undefined}
		>
			{/* Player 1 Row */}
			<div
				className={cn(
					"flex items-center justify-between border-b px-3 py-2",
					isFinalized && isPlayer1Winner && "bg-green-50 font-semibold",
				)}
			>
				<span
					className={cn(
						"truncate font-medium text-sm",
						isFinalized && !isPlayer1Winner && "text-muted-foreground",
					)}
				>
					{match.player1Seed && `(${match.player1Seed}) `}
					{truncate(match.player1Name, 30)}
				</span>
				{isFinalized && (
					<span
						className={cn(
							"ml-2 font-semibold text-sm tabular-nums",
							isPlayer1Winner ? "" : "text-muted-foreground",
						)}
					>
						{getPlayerScore(match, 1)}
					</span>
				)}
			</div>

			{/* Player 2 Row */}
			<div
				className={cn(
					"flex items-center justify-between px-3 py-2",
					isFinalized && isPlayer2Winner && "bg-green-50 font-semibold",
				)}
			>
				<span
					className={cn(
						"truncate font-medium text-sm",
						isFinalized && !isPlayer2Winner && "text-muted-foreground",
					)}
				>
					{match.player2Seed && `(${match.player2Seed}) `}
					{truncate(match.player2Name, 30)}
				</span>
				{isFinalized && (
					<span
						className={cn(
							"ml-2 font-semibold text-sm tabular-nums",
							isPlayer2Winner ? "" : "text-muted-foreground",
						)}
					>
						{getPlayerScore(match, 2)}
					</span>
				)}
			</div>
		</div>
	);
}
