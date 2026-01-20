"use client";

import { useState } from "react";
import { getRoundAbbreviation } from "~/lib/round-utils";
import { cn } from "~/lib/utils";
import { BracketMatch } from "./BracketMatch";
import type { RoundData } from "./bracket-types";

interface MobileBracketProps {
	rounds: RoundData[];
	onMatchClick?: (matchId: number) => void;
}

export function MobileBracket({ rounds, onMatchClick }: MobileBracketProps) {
	// Sort rounds by round number (ascending - earlier rounds first)
	const sortedRounds = [...rounds].sort(
		(a, b) => a.roundNumber - b.roundNumber,
	);

	// Default to active round, or most recent finalized, or first round
	const getDefaultRound = () => {
		const activeRound = sortedRounds.find((r) => r.isActive);
		if (activeRound) return activeRound.id.toString();

		// Find the latest round with finalized matches
		const roundsWithFinalizedMatches = sortedRounds.filter((r) =>
			r.matches.some((m) => m.status === "finalized"),
		);
		if (roundsWithFinalizedMatches.length > 0) {
			const latestFinalized =
				roundsWithFinalizedMatches[roundsWithFinalizedMatches.length - 1];
			if (latestFinalized) return latestFinalized.id.toString();
		}

		return sortedRounds[0]?.id.toString() ?? "";
	};

	const [selectedRoundId, setSelectedRoundId] = useState(getDefaultRound);

	const selectedRound = sortedRounds.find(
		(r) => r.id.toString() === selectedRoundId,
	);

	if (sortedRounds.length === 0) {
		return (
			<div className="py-8 text-center text-muted-foreground">
				No rounds available
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Round selector - ATP style circular buttons */}
			<div className="mb-4">
				<div className="scrollbar-hide flex gap-2 overflow-x-auto pb-2">
					{sortedRounds.map((round) => (
						<button
							aria-label={`${round.name}${round.isActive ? " (Active)" : ""}${round.isFinalized ? " (Finalized)" : ""}`}
							aria-pressed={selectedRoundId === round.id.toString()}
							className={cn(
								"flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
								"border-2 font-semibold text-sm transition-all",
								selectedRoundId === round.id.toString()
									? "border-primary bg-primary text-primary-foreground"
									: "border-border bg-background text-foreground hover:border-primary/50",
							)}
							key={round.id}
							onClick={() => setSelectedRoundId(round.id.toString())}
							type="button"
						>
							{getRoundAbbreviation(round.name, round.roundNumber)}
						</button>
					))}
				</div>
			</div>

			{/* Match list */}
			{selectedRound && (
				<div className="space-y-3">
					{selectedRound.matches.length === 0 ? (
						<div className="py-8 text-center text-muted-foreground">
							No matches in this round
						</div>
					) : (
						selectedRound.matches.map((match) => (
							<BracketMatch
								compact={false}
								key={match.id}
								match={match}
								onClick={onMatchClick}
							/>
						))
					)}
				</div>
			)}
		</div>
	);
}
