"use client";

import { BracketMatch } from "./BracketMatch";
import type { RoundData } from "./MobileBracket";

interface DesktopBracketProps {
	rounds: RoundData[];
	onMatchClick?: (matchId: number) => void;
}

export function DesktopBracket({ rounds, onMatchClick }: DesktopBracketProps) {
	// Sort rounds by round number (ascending for left-to-right display)
	const sortedRounds = [...rounds].sort(
		(a, b) => a.roundNumber - b.roundNumber,
	);

	// Find the first round to determine base match count
	const firstRound = sortedRounds[0];
	if (!firstRound) {
		return (
			<div className="py-8 text-center text-muted-foreground">
				No rounds available
			</div>
		);
	}

	const firstRoundMatchCount = firstRound.matches.length;

	// Match dimensions
	// Compact card: 2 player rows (28px each) + border (2px) = ~56px (score now inline)
	const matchHeight = 56; // Height of compact match card
	const playerRowHeight = 28; // Height of one player row (py-1.5 + text-xs)
	const matchConnectorOffset = playerRowHeight; // Connect at the divider between players
	const matchGap = 24; // Gap between matches in first round
	const columnWidth = 180; // Width of each round column
	const columnGap = 40; // Gap between columns for connectors
	const headerHeight = 32; // Height reserved for round headers

	// Calculate total height based on first round
	// First round: n matches with (n-1) gaps
	const totalHeight =
		firstRoundMatchCount * matchHeight +
		(firstRoundMatchCount - 1) * matchGap +
		headerHeight;

	return (
		<div className="overflow-x-auto pb-4">
			<div
				className="relative"
				style={{
					width: `${sortedRounds.length * (columnWidth + columnGap)}px`,
					height: `${totalHeight}px`,
				}}
			>
				{sortedRounds.map((round, roundIndex) => {
					// Calculate vertical spacing for this round
					// Each round has half the matches of the previous, so spacing doubles
					const spacingMultiplier = 2 ** roundIndex;
					// Unit height: one first-round slot = matchHeight + matchGap
					const unitHeight = matchHeight + matchGap;
					// Gap between matches in this round (in units)
					const gapInUnits = spacingMultiplier;
					// Offset from top to center first match (in units)
					const offsetInUnits = (spacingMultiplier - 1) / 2;

					const columnLeft = roundIndex * (columnWidth + columnGap);

					return (
						<div key={round.id}>
							{/* Round header */}
							<div
								className="absolute text-center font-semibold text-sm"
								style={{
									left: `${columnLeft}px`,
									top: 0,
									width: `${columnWidth}px`,
									height: `${headerHeight}px`,
								}}
							>
								{round.name}
							</div>

							{/* Matches */}
							{round.matches.map((match, matchIndex) => {
								// Calculate top position for this match
								const topInUnits = offsetInUnits + matchIndex * gapInUnits;
								const topPx = headerHeight + topInUnits * unitHeight;

								return (
									<div
										className="absolute"
										key={match.id}
										style={{
											left: `${columnLeft}px`,
											top: `${topPx}px`,
											width: `${columnWidth}px`,
										}}
									>
										<BracketMatch
											compact
											match={match}
											onClick={onMatchClick}
										/>
									</div>
								);
							})}

							{/* Connector lines to next round */}
							{roundIndex < sortedRounds.length - 1 &&
								round.matches.map((match, matchIndex) => {
									const topInUnits = offsetInUnits + matchIndex * gapInUnits;
									// Connect at the player divider line, not card center
									const matchConnectY =
										headerHeight +
										topInUnits * unitHeight +
										matchConnectorOffset;
									const isTopOfPair = matchIndex % 2 === 0;

									// Calculate the pair partner's position (for drawing vertical line)
									const pairPartnerIndex = isTopOfPair
										? matchIndex + 1
										: matchIndex - 1;
									const pairPartnerTopInUnits =
										offsetInUnits + pairPartnerIndex * gapInUnits;
									const pairPartnerConnectY =
										headerHeight +
										pairPartnerTopInUnits * unitHeight +
										matchConnectorOffset;

									// Next match connector position (at player divider)
									const nextMatchIndex = Math.floor(matchIndex / 2);
									const nextSpacingMultiplier = 2 ** (roundIndex + 1);
									const nextOffsetInUnits = (nextSpacingMultiplier - 1) / 2;
									const nextTopInUnits =
										nextOffsetInUnits + nextMatchIndex * nextSpacingMultiplier;
									const nextMatchConnectY =
										headerHeight +
										nextTopInUnits * unitHeight +
										matchConnectorOffset;

									// Horizontal line from match
									const hLineStartX = columnLeft + columnWidth;
									const hLineWidth = 12;

									// Vertical line X position
									const vLineX = hLineStartX + hLineWidth;

									// Vertical line goes from top match of pair to bottom match of pair
									const vLineTop = isTopOfPair
										? matchConnectY
										: pairPartnerConnectY;
									const vLineBottom = isTopOfPair
										? pairPartnerConnectY
										: matchConnectY;
									const vLineHeight = Math.abs(vLineBottom - vLineTop);

									return (
										<div key={`connector-${match.id}`}>
											{/* Horizontal line from current match */}
											<div
												className="absolute h-0.5 bg-border"
												style={{
													left: `${hLineStartX}px`,
													top: `${matchConnectY}px`,
													width: `${hLineWidth}px`,
												}}
											/>
											{/* Vertical connector (only draw once per pair, from top match) */}
											{isTopOfPair && (
												<div
													className="absolute w-0.5 bg-border"
													style={{
														left: `${vLineX}px`,
														top: `${vLineTop}px`,
														height: `${vLineHeight}px`,
													}}
												/>
											)}
											{/* Horizontal line to next match (only from top of pair) */}
											{isTopOfPair && (
												<div
													className="absolute h-0.5 bg-border"
													style={{
														left: `${vLineX}px`,
														top: `${nextMatchConnectY}px`,
														width: `${columnGap - hLineWidth * 2}px`,
													}}
												/>
											)}
										</div>
									);
								})}
						</div>
					);
				})}
			</div>
		</div>
	);
}
