"use client";

import { useState } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { BracketMatch, type MatchData } from "./BracketMatch";

export interface RoundData {
	id: number;
	name: string;
	roundNumber: number;
	matches: MatchData[];
	isFinalized: boolean;
	isActive: boolean;
}

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
			{/* Round selector */}
			<div className="flex items-center gap-2">
				<span className="font-medium text-sm">Round:</span>
				<Select onValueChange={setSelectedRoundId} value={selectedRoundId}>
					<SelectTrigger className="w-48">
						<SelectValue placeholder="Select round" />
					</SelectTrigger>
					<SelectContent>
						{sortedRounds.map((round) => (
							<SelectItem key={round.id} value={round.id.toString()}>
								{round.name}
								{round.isActive && " (Active)"}
								{round.isFinalized && " (Done)"}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
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
