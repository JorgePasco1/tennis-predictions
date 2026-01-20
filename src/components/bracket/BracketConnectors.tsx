"use client";

interface BracketConnectorsProps {
	matchIndex: number;
	matchHeight: number;
	matchGap: number;
	topPosition: number;
}

export function BracketConnectors({
	matchIndex,
	matchHeight,
	matchGap,
	topPosition,
}: BracketConnectorsProps) {
	// Constants
	const playerRowHeight = matchHeight / 2; // Half of match card height
	const connectorOffset = playerRowHeight; // Connect at player divider (middle of card)
	const hLineWidth = 20; // Horizontal line from card edge
	const topPadding = 16; // Space above first match (matches MobileRoundView)

	// Calculate if this is top or bottom of a pair
	const isTopOfPair = matchIndex % 2 === 0;
	const pairPartnerIndex = isTopOfPair ? matchIndex + 1 : matchIndex - 1;

	// Y positions for this match
	const matchConnectY = topPosition + connectorOffset;

	// Y position for pair partner using constant spacing formula
	const pairPartnerTopPosition =
		topPadding + pairPartnerIndex * (matchHeight + matchGap);
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
						top: `${nextRoundConnectY}px`,
						width: "40px",
					}}
				/>
			)}
		</>
	);
}
