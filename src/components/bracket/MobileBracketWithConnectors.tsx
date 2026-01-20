"use client";

import { useState } from "react";
import type { RoundData } from "./MobileBracket";
import { MobileRoundView } from "./MobileRoundView";
import { RoundNavigationButtons } from "./RoundNavigationButtons";

interface MobileBracketWithConnectorsProps {
	rounds: RoundData[];
	onMatchClick?: (matchId: number) => void;
}

export function MobileBracketWithConnectors({
	rounds,
	onMatchClick,
}: MobileBracketWithConnectorsProps) {
	// Sort rounds by round number (ascending - earlier rounds first)
	const sortedRounds = [...rounds].sort(
		(a, b) => a.roundNumber - b.roundNumber,
	);

	// Default to active round, or most recent finalized, or first round
	const getDefaultRoundIndex = (): number => {
		const activeIndex = sortedRounds.findIndex((r) => r.isActive);
		if (activeIndex !== -1) return activeIndex;

		// Find the latest round with finalized matches
		const roundsWithFinalizedMatches = sortedRounds.filter((r) =>
			r.matches.some((m) => m.status === "finalized"),
		);
		if (roundsWithFinalizedMatches.length > 0) {
			const latestFinalized =
				roundsWithFinalizedMatches[roundsWithFinalizedMatches.length - 1];
			if (latestFinalized) {
				return sortedRounds.findIndex((r) => r.id === latestFinalized.id);
			}
		}

		return 0; // First round
	};

	const [selectedRoundIndex, setSelectedRoundIndex] =
		useState(getDefaultRoundIndex);

	// Transform calculation for sliding
	const translateX = -(selectedRoundIndex * 100); // Each round is 100vw wide

	if (sortedRounds.length === 0) {
		return (
			<div className="py-8 text-center text-muted-foreground">
				No rounds available
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Navigation buttons */}
			<RoundNavigationButtons
				onSelectRound={setSelectedRoundIndex}
				rounds={sortedRounds}
				selectedIndex={selectedRoundIndex}
			/>

			{/* Sliding viewport */}
			<div className="overflow-hidden">
				<div
					style={{
						display: "flex",
						transform: `translateX(${translateX}vw)`,
						transition: "transform 0.3s ease-in-out",
						willChange: "transform",
					}}
				>
					{sortedRounds.map((round, index) => (
						<div key={round.id} style={{ minWidth: "100vw", width: "100vw" }}>
							<MobileRoundView
								hasNextRound={index < sortedRounds.length - 1}
								onMatchClick={onMatchClick}
								round={round}
								roundIndex={index}
							/>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
