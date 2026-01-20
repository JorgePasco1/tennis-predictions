"use client";

interface BracketConnectorsProps {
	matchIndex: number;
	matchHeight: number;
	matchGap: number;
	topPosition: number;
	roundIndex: number;
}

export function BracketConnectors({
	matchIndex,
	matchHeight,
	matchGap,
	topPosition,
	roundIndex,
}: BracketConnectorsProps) {
	// Constants
	const playerRowHeight = matchHeight / 2; // Half of match card height
	const connectorOffset = playerRowHeight; // Connect at player divider (middle of card)
	const hLineWidth = 20; // Horizontal line from card edge

	// Calculate if this is top or bottom of a pair
	const isTopOfPair = matchIndex % 2 === 0;
	const pairPartnerIndex = isTopOfPair ? matchIndex + 1 : matchIndex - 1;

	// Y positions for this match
	const matchConnectY = topPosition + connectorOffset;

	// Y position for pair partner
	const pairPartnerTopPosition = pairPartnerIndex * (matchHeight + matchGap);
	const pairPartnerConnectY = pairPartnerTopPosition + connectorOffset;

	// Next round match position (midpoint between pair)
	const nextMatchIndex = Math.floor(matchIndex / 2);
	const nextSpacingMultiplier = 2 ** (roundIndex + 1);
	const unitHeight = matchHeight + matchGap;
	const nextOffsetInUnits = (nextSpacingMultiplier - 1) / 2;
	const nextTopInUnits =
		nextOffsetInUnits + nextMatchIndex * nextSpacingMultiplier;
	const nextMatchConnectY = nextTopInUnits * unitHeight + connectorOffset;

	// Vertical line height
	const vLineTop = isTopOfPair ? matchConnectY : pairPartnerConnectY;
	const vLineBottom = isTopOfPair ? pairPartnerConnectY : matchConnectY;
	const vLineHeight = Math.abs(vLineBottom - vLineTop);

	return (
		<>
			{/* Horizontal line from match to the right */}
			<div
				className="absolute h-0.5 bg-border"
				style={{
					right: "56px",
					top: `${matchConnectY}px`,
					width: `${hLineWidth}px`,
				}}
			/>

			{/* Vertical line (only draw once per pair, from top match) */}
			{isTopOfPair && (
				<div
					className="absolute w-0.5 bg-border"
					style={{
						right: "56px",
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
						right: "16px",
						top: `${nextMatchConnectY}px`,
						width: "40px",
					}}
				/>
			)}
		</>
	);
}
