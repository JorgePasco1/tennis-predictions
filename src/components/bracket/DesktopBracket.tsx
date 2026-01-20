"use client";

import { BracketMatch } from "./BracketMatch";
import type { RoundData } from "./MobileBracket";

interface DesktopBracketProps {
	rounds: RoundData[];
}

export function DesktopBracket({ rounds }: DesktopBracketProps) {
	// Sort rounds by round number (ascending for left-to-right display)
	const sortedRounds = [...rounds].sort(
		(a, b) => a.roundNumber - b.roundNumber,
	);

	if (sortedRounds.length === 0) {
		return (
			<div className="py-8 text-center text-muted-foreground">
				No rounds available
			</div>
		);
	}

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
	const matchHeight = 76; // Height of compact match card
	const matchGap = 12; // Gap between matches in first round
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
										<BracketMatch compact match={match} />
									</div>
								);
							})}

							{/* Connector lines to next round */}
							{roundIndex < sortedRounds.length - 1 &&
								round.matches.map((match, matchIndex) => {
									const topInUnits = offsetInUnits + matchIndex * gapInUnits;
									const matchCenterY =
										headerHeight + topInUnits * unitHeight + matchHeight / 2;
									const isTopOfPair = matchIndex % 2 === 0;
									const nextMatchIndex = Math.floor(matchIndex / 2);
									const nextSpacingMultiplier = 2 ** (roundIndex + 1);
									const nextOffsetInUnits = (nextSpacingMultiplier - 1) / 2;
									const nextTopInUnits =
										nextOffsetInUnits + nextMatchIndex * nextSpacingMultiplier;
									const nextMatchCenterY =
										headerHeight +
										nextTopInUnits * unitHeight +
										matchHeight / 2;

									// Horizontal line from match
									const hLineStartX = columnLeft + columnWidth;
									const hLineWidth = 12;

									// Vertical line
									const vLineX = hLineStartX + hLineWidth;
									const vLineTop = isTopOfPair
										? matchCenterY
										: nextMatchCenterY;
									const vLineBottom = isTopOfPair
										? nextMatchCenterY
										: matchCenterY;
									const vLineHeight = Math.abs(vLineBottom - vLineTop);

									// Horizontal line to next match
									const hLine2StartX = vLineX;

									return (
										<div key={`connector-${match.id}`}>
											{/* Horizontal line from current match */}
											<div
												className="absolute h-0.5 bg-border"
												style={{
													left: `${hLineStartX}px`,
													top: `${matchCenterY}px`,
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
														left: `${hLine2StartX}px`,
														top: `${nextMatchCenterY}px`,
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
