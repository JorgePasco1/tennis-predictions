"use client";

import { useState } from "react";
import { DesktopBracket } from "./DesktopBracket";
import type { RoundData } from "./MobileBracket";
import { RoundNavigationButtons } from "./RoundNavigationButtons";

interface MobileBracketViewportProps {
	rounds: RoundData[];
	onMatchClick?: (matchId: number) => void;
}

export function MobileBracketViewport({
	rounds,
	onMatchClick,
}: MobileBracketViewportProps) {
	// Sort rounds by round number (ascending - earlier rounds first)
	const sortedRounds = [...rounds].sort(
		(a, b) => a.roundNumber - b.roundNumber,
	);

	// Default to active round, or most recent finalized, or first round
	// Returns the index in sortedRounds array
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

	// Calculate the transform to show the selected round
	const columnWidth = 180;
	const columnGap = 40;
	const translateX = -(selectedRoundIndex * (columnWidth + columnGap));

	// Calculate viewport width to show from selected round to the end
	// This prevents showing previous rounds while allowing all subsequent rounds to be visible
	const remainingRounds = sortedRounds.length - selectedRoundIndex;
	const viewportWidth = remainingRounds * (columnWidth + columnGap);

	if (sortedRounds.length === 0) {
		return (
			<div className="py-8 text-center text-muted-foreground">
				No rounds available
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Round navigation - circular buttons */}
			<RoundNavigationButtons
				onSelectRound={setSelectedRoundIndex}
				rounds={sortedRounds}
				selectedIndex={selectedRoundIndex}
			/>

			{/* Viewport container - show from selected round to end */}
			<div
				className="overflow-y-auto"
				style={{
					width: `${viewportWidth}px`,
					maxWidth: "100%",
					maxHeight: "70vh",
					overflowX: "clip",
					touchAction: "pan-y",
					overscrollBehaviorX: "none",
				}}
			>
				{/* Transform wrapper to slide the bracket horizontally */}
				<div
					style={{
						transform: `translateX(${translateX}px)`,
						transition: "transform 0.3s ease-in-out",
						willChange: "transform",
					}}
				>
					{/* DesktopBracket renders inside viewport */}
					<DesktopBracket onMatchClick={onMatchClick} rounds={rounds} />
				</div>
			</div>
		</div>
	);
}
