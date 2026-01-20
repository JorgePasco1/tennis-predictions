"use client";

import { BracketConnectors } from "./BracketConnectors";
import type { RoundData } from "./MobileBracket";
import { MobileMatchCard } from "./MobileMatchCard";

interface MobileRoundViewProps {
	round: RoundData;
	roundIndex: number;
	hasNextRound: boolean;
	onMatchClick?: (matchId: number) => void;
}

export function MobileRoundView({
	round,
	roundIndex,
	hasNextRound,
	onMatchClick,
}: MobileRoundViewProps) {
	const matchHeight = 80; // Taller than desktop (56px)
	const matchGap = 24;
	const unitHeight = matchHeight + matchGap;

	// Calculate spacing for this round (matches double in vertical spacing each round)
	const spacingMultiplier = 2 ** roundIndex;
	const offsetInUnits = (spacingMultiplier - 1) / 2;

	// Calculate minimum height needed for this round
	const calculateHeight = () => {
		if (round.matches.length === 0) return 200;
		const lastMatchIndex = round.matches.length - 1;
		const lastMatchTopInUnits =
			offsetInUnits + lastMatchIndex * spacingMultiplier;
		return lastMatchTopInUnits * unitHeight + matchHeight + 40; // +40 for bottom padding
	};

	return (
		<div className="px-4" style={{ minHeight: `${calculateHeight()}px` }}>
			{/* Round header */}
			<h3 className="sticky top-0 z-10 mb-4 bg-background py-2 text-center font-semibold text-lg">
				{round.name}
			</h3>

			{/* Container for matches and connectors */}
			<div className="relative">
				{round.matches.map((match, matchIndex) => {
					// Calculate top position for this match
					const topInUnits = offsetInUnits + matchIndex * spacingMultiplier;
					const topPosition = topInUnits * unitHeight;

					return (
						<div key={match.id}>
							{/* Match card (full width minus connector space) */}
							<div
								className="absolute"
								style={{
									top: `${topPosition}px`,
									left: 0,
									right: hasNextRound ? "60px" : "0", // Space for connectors
								}}
							>
								<MobileMatchCard match={match} onClick={onMatchClick} />
							</div>

							{/* Connector lines (if not last round) */}
							{hasNextRound && (
								<BracketConnectors
									matchGap={matchGap}
									matchHeight={matchHeight}
									matchIndex={matchIndex}
									roundIndex={roundIndex}
									topPosition={topPosition}
								/>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
