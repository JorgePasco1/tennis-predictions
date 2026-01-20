"use client";

import { BracketConnectors } from "./BracketConnectors";
import { BracketMatch } from "./BracketMatch";
import type { RoundData } from "./MobileBracket";

interface MobileRoundViewProps {
	round: RoundData;
	hasNextRound: boolean;
	onMatchClick?: (matchId: number) => void;
}

export function MobileRoundView({
	round,
	hasNextRound,
	onMatchClick,
}: MobileRoundViewProps) {
	const matchHeight = 80; // Taller than desktop (56px)
	const matchGap = 24;
	const topPadding = 16; // Space above first match
	const bottomPadding = 80; // Space below last match (includes shadows/borders)

	// Calculate minimum height needed for this round with constant spacing
	const calculateHeight = () => {
		if (round.matches.length === 0) return 200;
		const matchCount = round.matches.length;

		// Total height = top padding + all matches + gaps between matches + bottom padding
		const totalMatchesHeight = matchCount * matchHeight;
		const totalGapsHeight = (matchCount - 1) * matchGap;

		return topPadding + totalMatchesHeight + totalGapsHeight + bottomPadding;
	};

	return (
		<div style={{ height: `${calculateHeight()}px`, width: "100%" }}>
			{/* Round header */}
			<h3 className="sticky top-0 z-10 mb-4 bg-background px-4 py-2 text-center font-semibold text-lg">
				{round.name}
			</h3>

			{/* Container for matches and connectors */}
			<div className="relative">
				{round.matches.map((match, matchIndex) => {
					// Simple sequential positioning: top padding + (match index × unit size)
					const topPosition = topPadding + matchIndex * (matchHeight + matchGap);

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
