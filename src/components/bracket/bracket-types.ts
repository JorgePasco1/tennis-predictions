import type { MatchData } from "./BracketMatch";

/**
 * Shared type definitions for bracket components
 */

export interface RoundData {
	id: number;
	name: string;
	roundNumber: number;
	matches: MatchData[];
	isFinalized: boolean;
	isActive: boolean;
}

// Re-export MatchData for convenience
export type { MatchData } from "./BracketMatch";
