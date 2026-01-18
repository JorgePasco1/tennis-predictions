/**
 * Progressive Round-Based Scoring Configuration
 *
 * Maps round names to their point values using a moderate progression:
 * 2-3-5-8-12-18-30 points per round
 *
 * Exact score bonus: +50% (multiply base points by 1.5, rounded up)
 */

/**
 * Gets the scoring configuration for a given round name
 *
 * @param roundName - The name of the round (e.g., "Round of 128", "Semi Finals", "Final")
 * @returns Object with pointsPerWinner and pointsExactScore
 */
export function getScoringForRound(roundName: string): {
	pointsPerWinner: number;
	pointsExactScore: number;
} {
	const roundScoring: Record<string, number> = {
		"Round of 128": 2,
		"Round of 64": 3,
		"Round of 32": 5,
		"Round of 16": 8,
		"Quarter Finals": 12,
		"Semi Finals": 18,
		Final: 30,
	};

	const winnerPoints = roundScoring[roundName] ?? 10; // fallback to 10 for unknown rounds
	const exactScorePoints = Math.ceil(winnerPoints * 1.5);

	return {
		pointsPerWinner: winnerPoints,
		pointsExactScore: exactScorePoints,
	};
}
