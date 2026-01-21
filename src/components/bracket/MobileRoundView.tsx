"use client";

import { BracketConnectors } from "./BracketConnectors";
import { BracketMatch } from "./BracketMatch";
import {
	BOTTOM_PADDING,
	CARD_RIGHT_MARGIN,
	MATCH_GAP,
	MATCH_HEIGHT,
	TOP_PADDING,
} from "./bracket-constants";
import type { RoundData } from "./bracket-types";

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
	// Calculate minimum height needed for this round with constant spacing
	const calculateHeight = () => {
		if (round.matches.length === 0) return 200;
		const matchCount = round.matches.length;

		// Total height = top padding + all matches + gaps between matches + bottom padding
		const totalMatchesHeight = matchCount * MATCH_HEIGHT;
		const totalGapsHeight = (matchCount - 1) * MATCH_GAP;

		return TOP_PADDING + totalMatchesHeight + totalGapsHeight + BOTTOM_PADDING;
	};

	return (
		<div style={{ height: `${calculateHeight()}px`, width: "100%" }}>
			{/* Round header */}
			<h3 className="mb-4 bg-background px-4 py-2 text-center font-semibold text-lg">
				{round.name}
			</h3>

			{/* Container for matches and connectors */}
			<div className="relative">
				{round.matches.map((match, matchIndex) => {
					// Simple sequential positioning: top padding + (match index × unit size)
					const topPosition =
						TOP_PADDING + matchIndex * (MATCH_HEIGHT + MATCH_GAP);

					return (
						<div key={match.id}>
							{/* Match card (full width minus connector space) */}
							<div
								className="absolute"
								style={{
									top: `${topPosition}px`,
									left: "16px",
									right: hasNextRound ? `${CARD_RIGHT_MARGIN}px` : "16px",
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
									matchGap={MATCH_GAP}
									matchHeight={MATCH_HEIGHT}
									matchIndex={matchIndex}
									topPosition={topPosition}
									totalMatches={round.matches.length}
								/>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
