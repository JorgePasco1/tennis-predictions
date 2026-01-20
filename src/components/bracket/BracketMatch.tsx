"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

export interface MatchData {
	id: number;
	matchNumber: number;
	player1Name: string;
	player2Name: string;
	player1Seed: number | null;
	player2Seed: number | null;
	status: string;
	winnerName: string | null;
	finalScore: string | null;
	isRetirement: boolean;
	userPick: {
		predictedWinner: string;
		predictedSetsWon: number;
		predictedSetsLost: number;
		isWinnerCorrect: boolean | null;
		isExactScore: boolean | null;
		pointsEarned: number;
	} | null;
}

interface BracketMatchProps {
	match: MatchData;
	compact?: boolean;
	variant?: "compact" | "mobile";
	onClick?: (matchId: number) => void;
}

function formatPlayerName(name: string, seed: number | null, maxLength = 20) {
	const seedPrefix = seed ? `(${seed}) ` : "";
	const availableLength = maxLength - seedPrefix.length;
	const truncatedName =
		name.length > availableLength
			? `${name.substring(0, availableLength - 1)}…`
			: name;
	return `${seedPrefix}${truncatedName}`;
}

export function BracketMatch({
	match,
	compact = false,
	variant = "compact",
	onClick,
}: BracketMatchProps) {
	const isClickable = !!onClick;
	const handleClick = () => {
		if (onClick) {
			onClick(match.id);
		}
	};
	const isFinalized = match.status === "finalized";
	const isRetirement = match.isRetirement;
	const userPick = match.userPick;

	// Variant configurations
	const variantConfig = {
		compact: {
			width: "w-44",
			textSize: "text-xs",
			padding: "px-2 py-1.5",
			nameMaxLength: 16,
		},
		mobile: {
			width: "w-full",
			textSize: "text-sm",
			padding: "px-3 py-2",
			nameMaxLength: 30,
		},
	};

	const config = variantConfig[variant];

	const isPlayer1Winner = match.winnerName === match.player1Name;
	const isPlayer2Winner = match.winnerName === match.player2Name;

	const userPickedPlayer1 = userPick?.predictedWinner === match.player1Name;
	const userPickedPlayer2 = userPick?.predictedWinner === match.player2Name;

	// Parse "3-0" into [winnerSets, loserSets]
	const scoreParts = match.finalScore?.split("-").map(Number) ?? [];
	const [winnerSets, loserSets] =
		scoreParts.length === 2 ? scoreParts : [undefined, undefined];
	const player1Sets = isPlayer1Winner
		? winnerSets
		: isPlayer2Winner
			? loserSets
			: undefined;
	const player2Sets = isPlayer2Winner
		? winnerSets
		: isPlayer1Winner
			? loserSets
			: undefined;

	if (compact) {
		return (
			<div
				className={cn(
					config.width,
					config.textSize,
					"rounded border bg-card shadow-sm",
					isFinalized &&
						userPick &&
						!isRetirement &&
						(userPick.isWinnerCorrect ? "border-green-400" : "border-red-400"),
					isClickable && "cursor-pointer transition-shadow hover:shadow-md",
				)}
				onClick={handleClick}
				onKeyDown={(e) => {
					if (!isClickable) return;
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						handleClick();
					}
				}}
				role={isClickable ? "button" : undefined}
				tabIndex={isClickable ? 0 : undefined}
			>
				{/* Player 1 */}
				<div
					className={cn(
						"flex items-center justify-between border-b",
						config.padding,
						isFinalized && isPlayer1Winner && "bg-green-50 font-semibold",
					)}
				>
					<div className="flex min-w-0 items-center gap-1">
						<span
							className={cn(
								"truncate",
								isFinalized && !isPlayer1Winner && "text-muted-foreground",
							)}
						>
							{formatPlayerName(
								match.player1Name,
								match.player1Seed,
								config.nameMaxLength,
							)}
						</span>
						{userPickedPlayer1 && (
							<span
								className={cn(
									"size-1.5 shrink-0 rounded-full",
									isFinalized
										? isRetirement
											? "bg-gray-400"
											: userPick?.isWinnerCorrect
												? "bg-green-500"
												: "bg-red-500"
										: "bg-blue-500",
								)}
							/>
						)}
					</div>
					{isFinalized && (
						<span
							className={cn(
								"ml-1 tabular-nums",
								isPlayer1Winner ? "font-semibold" : "text-muted-foreground",
							)}
						>
							{isRetirement && !isPlayer1Winner ? "Ret" : player1Sets}
						</span>
					)}
				</div>

				{/* Player 2 */}
				<div
					className={cn(
						"flex items-center justify-between",
						config.padding,
						isFinalized && isPlayer2Winner && "bg-green-50 font-semibold",
					)}
				>
					<div className="flex min-w-0 items-center gap-1">
						<span
							className={cn(
								"truncate",
								isFinalized && !isPlayer2Winner && "text-muted-foreground",
							)}
						>
							{formatPlayerName(
								match.player2Name,
								match.player2Seed,
								config.nameMaxLength,
							)}
						</span>
						{userPickedPlayer2 && (
							<span
								className={cn(
									"size-1.5 shrink-0 rounded-full",
									isFinalized
										? isRetirement
											? "bg-gray-400"
											: userPick?.isWinnerCorrect
												? "bg-green-500"
												: "bg-red-500"
										: "bg-blue-500",
								)}
							/>
						)}
					</div>
					{isFinalized && (
						<span
							className={cn(
								"ml-1 tabular-nums",
								isPlayer2Winner ? "font-semibold" : "text-muted-foreground",
							)}
						>
							{isRetirement && !isPlayer2Winner ? "Ret" : player2Sets}
						</span>
					)}
				</div>
			</div>
		);
	}

	// Expanded view for mobile
	return (
		<div
			className={cn(
				"rounded-lg border bg-card p-4 shadow-sm",
				isFinalized &&
					(isRetirement
						? "border-gray-300 bg-gray-50"
						: userPick?.isWinnerCorrect
							? "border-green-300 bg-green-50"
							: userPick
								? "border-red-300 bg-red-50"
								: ""),
				isClickable && "cursor-pointer transition-shadow hover:shadow-md",
			)}
			onClick={handleClick}
			onKeyDown={(e) => {
				if (!isClickable) return;
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					handleClick();
				}
			}}
			role={isClickable ? "button" : undefined}
			tabIndex={isClickable ? 0 : undefined}
		>
			<div className="mb-2 flex items-center justify-between">
				<span className="font-medium text-muted-foreground text-sm">
					Match {match.matchNumber}
				</span>
				<div className="flex gap-2">
					{isRetirement && <Badge className="bg-red-600 text-xs">RET</Badge>}
					{isFinalized && <Badge variant="secondary">Final</Badge>}
				</div>
			</div>

			{/* Players */}
			<div className="space-y-2">
				{/* Player 1 */}
				<div
					className={cn(
						"flex items-center justify-between rounded px-3 py-2",
						isFinalized && isPlayer1Winner
							? "bg-green-100 font-semibold"
							: "bg-muted/50",
						userPickedPlayer1 && !isFinalized && "ring-2 ring-blue-400",
					)}
				>
					<span>
						{match.player1Seed && (
							<span className="text-muted-foreground">
								({match.player1Seed}){" "}
							</span>
						)}
						{match.player1Name}
					</span>
					<div className="flex items-center gap-2">
						{isFinalized && player1Sets !== undefined && (
							<span
								className={cn(
									"tabular-nums",
									isPlayer1Winner ? "font-semibold" : "text-muted-foreground",
								)}
							>
								{player1Sets}
							</span>
						)}
						{userPickedPlayer1 && (
							<span className="text-blue-600 text-xs">Your pick</span>
						)}
					</div>
				</div>

				{/* Player 2 */}
				<div
					className={cn(
						"flex items-center justify-between rounded px-3 py-2",
						isFinalized && isPlayer2Winner
							? "bg-green-100 font-semibold"
							: "bg-muted/50",
						userPickedPlayer2 && !isFinalized && "ring-2 ring-blue-400",
					)}
				>
					<span>
						{match.player2Seed && (
							<span className="text-muted-foreground">
								({match.player2Seed}){" "}
							</span>
						)}
						{match.player2Name}
					</span>
					<div className="flex items-center gap-2">
						{isFinalized && player2Sets !== undefined && (
							<span
								className={cn(
									"tabular-nums",
									isPlayer2Winner ? "font-semibold" : "text-muted-foreground",
								)}
							>
								{player2Sets}
							</span>
						)}
						{userPickedPlayer2 && (
							<span className="text-blue-600 text-xs">Your pick</span>
						)}
					</div>
				</div>
			</div>

			{/* Result row */}
			{isFinalized && userPick && !isRetirement && (
				<div className="mt-3 flex items-center justify-end text-sm">
					<div className="flex items-center gap-2">
						{userPick.isWinnerCorrect ? (
							<span className="flex items-center text-green-700">
								<CheckCircle2 className="mr-1 h-4 w-4" />
								Correct
							</span>
						) : (
							<span className="flex items-center text-red-700">
								<XCircle className="mr-1 h-4 w-4" />
								Wrong
							</span>
						)}
						{userPick.isExactScore && (
							<Badge className="bg-green-600 text-xs">Exact!</Badge>
						)}
					</div>
				</div>
			)}

			{/* User pick details */}
			{userPick && (
				<div className="mt-2 text-muted-foreground text-xs">
					Your prediction: {userPick.predictedWinner} (
					{userPick.predictedSetsWon}-{userPick.predictedSetsLost})
					{isFinalized && !isRetirement && (
						<span className="ml-2 font-medium text-primary">
							+{userPick.pointsEarned} pts
						</span>
					)}
				</div>
			)}
		</div>
	);
}
