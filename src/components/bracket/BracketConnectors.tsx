"use client";

import {
	CONNECTOR_RIGHT_OFFSET,
	H_LINE_WIDTH,
	NEXT_ROUND_CONNECTOR_RIGHT,
	NEXT_ROUND_CONNECTOR_WIDTH,
	TOP_PADDING,
} from "./bracket-constants";

interface BracketConnectorsProps {
	matchIndex: number;
	matchHeight: number;
	matchGap: number;
	topPosition: number;
	totalMatches: number;
}

export function BracketConnectors({
	matchIndex,
	matchHeight,
	matchGap,
	topPosition,
	totalMatches,
}: BracketConnectorsProps) {
	// Calculate connector offset (middle of card where player divider is)
	const playerRowHeight = matchHeight / 2;
	const connectorOffset = playerRowHeight;

	// Calculate if this is top or bottom of a pair
	const isTopOfPair = matchIndex % 2 === 0;
	const pairPartnerIndex = isTopOfPair ? matchIndex + 1 : matchIndex - 1;
	const hasPairPartner =
		pairPartnerIndex >= 0 && pairPartnerIndex < totalMatches;

	// Y positions for this match
	const matchConnectY = topPosition + connectorOffset;

	// If no pair partner exists (odd number of matches), only draw horizontal line
	if (!hasPairPartner) {
		return (
			<div
				className="absolute h-0.5 bg-border"
				style={{
					right: `${CONNECTOR_RIGHT_OFFSET}px`,
					top: `${matchConnectY}px`,
					width: `${H_LINE_WIDTH}px`,
				}}
			/>
		);
	}

	// Y position for pair partner using constant spacing formula
	const pairPartnerTopPosition =
		TOP_PADDING + pairPartnerIndex * (matchHeight + matchGap);
	const pairPartnerConnectY = pairPartnerTopPosition + connectorOffset;

	// Vertical line height and position
	const vLineTop = isTopOfPair ? matchConnectY : pairPartnerConnectY;
	const vLineBottom = isTopOfPair ? pairPartnerConnectY : matchConnectY;
	const vLineHeight = Math.abs(vLineBottom - vLineTop);

	// Horizontal line to next round should be at midpoint of vertical line
	// (this is where the two matches feed into the next round)
	const nextRoundConnectY = vLineTop + vLineHeight / 2;

	return (
		<>
			{/* Horizontal line from match to the right */}
			<div
				className="absolute h-0.5 bg-border"
				style={{
					right: `${CONNECTOR_RIGHT_OFFSET}px`,
					top: `${matchConnectY}px`,
					width: `${H_LINE_WIDTH}px`,
				}}
			/>

			{/* Vertical line (only draw once per pair, from top match) */}
			{isTopOfPair && (
				<div
					className="absolute w-0.5 bg-border"
					style={{
						right: `${CONNECTOR_RIGHT_OFFSET}px`,
						top: `${vLineTop}px`,
						height: `${vLineHeight}px`,
					}}
				/>
			)}

			{/* Horizontal line to next match position (only from top of pair) */}
			{isTopOfPair && (
				<div
					className="absolute h-0.5 bg-border"
					style={{
						right: `${NEXT_ROUND_CONNECTOR_RIGHT}px`,
						top: `${nextRoundConnectY}px`,
						width: `${NEXT_ROUND_CONNECTOR_WIDTH}px`,
					}}
				/>
			)}
		</>
	);
}
