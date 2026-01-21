/**
 * Shared type definitions for bracket components
 */

export interface MatchData {
	id: number;
	matchNumber: number;
	player1Name: string;
	player2Name: string;
	player1Seed: number | null;
	player2Seed: number | null;
	status: string;
	winnerName: string | null;
	finalScore: string | null;
	isRetirement: boolean;
	userPick: {
		predictedWinner: string;
		predictedSetsWon: number;
		predictedSetsLost: number;
		isWinnerCorrect: boolean | null;
		isExactScore: boolean | null;
		pointsEarned: number;
	} | null;
}

export interface RoundData {
	id: number;
	name: string;
	roundNumber: number;
	matches: MatchData[];
	isFinalized: boolean;
	isActive: boolean;
}
