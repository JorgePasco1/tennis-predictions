"use client";

import { DesktopBracket } from "./DesktopBracket";
import { MobileBracket, type RoundData } from "./MobileBracket";

interface TournamentBracketProps {
	rounds: RoundData[];
}

export function TournamentBracket({ rounds }: TournamentBracketProps) {
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
				<DesktopBracket rounds={rounds} />
			</div>

			{/* Mobile bracket - hidden on desktop */}
			<div className="lg:hidden">
				<MobileBracket rounds={rounds} />
			</div>
		</>
	);
}

export type { MatchData } from "./BracketMatch";
// Re-export types for convenience
export type { RoundData } from "./MobileBracket";
