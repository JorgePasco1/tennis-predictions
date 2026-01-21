"use client";

import { useState } from "react";
import type { RoundData } from "./bracket-types";
import { DesktopBracket } from "./DesktopBracket";
import { MatchPicksModal } from "./MatchPicksModal";
import { MobileBracketWithConnectors } from "./MobileBracketWithConnectors";

interface TournamentBracketProps {
	rounds: RoundData[];
}

export function TournamentBracket({ rounds }: TournamentBracketProps) {
	const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
	const [modalOpen, setModalOpen] = useState(false);

	const handleMatchClick = (matchId: number) => {
		setSelectedMatchId(matchId);
		setModalOpen(true);
	};

	const handleModalOpenChange = (open: boolean) => {
		setModalOpen(open);
		if (!open) {
			setSelectedMatchId(null);
		}
	};

	if (rounds.length === 0) {
		return (
			<div className="py-12 text-center">
				<div className="mb-4 text-6xl">🎾</div>
				<h2 className="mb-2 font-semibold text-2xl">No Bracket Yet</h2>
				<p className="text-muted-foreground">
					The tournament bracket will appear here once matches are added
				</p>
			</div>
		);
	}

	return (
		<>
			{/* Desktop bracket - hidden on mobile */}
			<div className="hidden lg:block">
				<DesktopBracket onMatchClick={handleMatchClick} rounds={rounds} />
			</div>

			{/* Mobile bracket - hidden on desktop */}
			<div className="lg:hidden">
				<MobileBracketWithConnectors
					onMatchClick={handleMatchClick}
					rounds={rounds}
				/>
			</div>

			{/* Match picks modal */}
			<MatchPicksModal
				matchId={selectedMatchId}
				onOpenChange={handleModalOpenChange}
				open={modalOpen}
			/>
		</>
	);
}

// Re-export types for convenience
export type { MatchData, RoundData } from "./bracket-types";
