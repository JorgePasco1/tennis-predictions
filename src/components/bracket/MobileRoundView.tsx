"use client";

import { BracketConnectors } from "./BracketConnectors";
import { BracketMatch } from "./BracketMatch";
import type { RoundData } from "./MobileBracket";

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
		return lastMatchTopInUnits * unitHeight + matchHeight + 80; // +80 for bottom padding (includes shadows/borders)
	};

	return (
		<div style={{ minHeight: `${calculateHeight()}px`, width: "100%" }}>
			{/* Round header */}
			<h3 className="sticky top-0 z-10 mb-4 bg-background px-4 py-2 text-center font-semibold text-lg">
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
									left: "16px",
									right: hasNextRound ? "76px" : "16px",
								}}
							>
								<BracketMatch
									compact
									match={match}
									onClick={onMatchClick}
									variant="mobile"
								/>
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
