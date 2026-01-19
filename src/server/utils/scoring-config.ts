/**
 * Hybrid Round-Based Scoring Configuration
 *
 * Uses a predominantly flat system with slight late-round increases:
 * - R128 through QF: 10 winner / 5 exact score
 * - Semi Finals: 12 winner / 6 exact score
 * - Final: 15 winner / 8 exact score
 *
 * Exact score bonus: ~50% of winner points (fixed per round)
 *
 * See docs/SCORING.md for full documentation.
 */

interface RoundScoring {
	pointsPerWinner: number;
	pointsExactScore: number;
}

/**
 * Gets the scoring configuration for a given round name
 *
 * @param roundName - The name of the round (e.g., "Round of 128", "Semi Finals", "Final")
 * @returns Object with pointsPerWinner and pointsExactScore
 */
export function getScoringForRound(roundName: string): RoundScoring {
	const roundScoring: Record<string, RoundScoring> = {
		"Round of 128": { pointsPerWinner: 10, pointsExactScore: 5 },
		"Round of 64": { pointsPerWinner: 10, pointsExactScore: 5 },
		"Round of 32": { pointsPerWinner: 10, pointsExactScore: 5 },
		"Round of 16": { pointsPerWinner: 10, pointsExactScore: 5 },
		"Quarter Finals": { pointsPerWinner: 10, pointsExactScore: 5 },
		"Semi Finals": { pointsPerWinner: 12, pointsExactScore: 6 },
		Final: { pointsPerWinner: 15, pointsExactScore: 8 },
	};

	// Default to 10/5 for unknown rounds
	return (
		roundScoring[roundName] ?? { pointsPerWinner: 10, pointsExactScore: 5 }
	);
}
