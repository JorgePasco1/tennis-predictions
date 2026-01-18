import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "~/server/db/schema";
import {
	matches,
	matchPicks,
	rounds,
	userRoundPicks,
} from "~/server/db/schema";

/**
 * Calculate scores for all picks related to a specific match
 * Called when a match is finalized
 */
export async function calculateMatchPickScores(
	db: NodePgDatabase<typeof schema>,
	matchId: number,
): Promise<void> {
	// Get the match with its round and scoring rule
	const match = await db.query.matches.findFirst({
		where: eq(matches.id, matchId),
		with: {
			round: {
				with: {
					scoringRule: true,
				},
			},
		},
	});

	if (!match) {
		throw new Error(`Match ${matchId} not found`);
	}

	if (match.status !== "finalized") {
		throw new Error(`Match ${matchId} is not finalized`);
	}

	if (!match.winnerName || match.setsWon === null || match.setsLost === null) {
		throw new Error(`Match ${matchId} does not have complete result data`);
	}

	// Get scoring rule (default if not found)
	const pointsPerWinner = match.round.scoringRule?.pointsPerWinner ?? 10;
	const pointsExactScore = match.round.scoringRule?.pointsExactScore ?? 5;

	// Get all picks for this match
	const picks = await db.query.matchPicks.findMany({
		where: eq(matchPicks.matchId, matchId),
	});

	// Calculate and update each pick
	for (const pick of picks) {
		const isWinnerCorrect = pick.predictedWinner === match.winnerName;
		const isExactScore =
			isWinnerCorrect &&
			pick.predictedSetsWon === match.setsWon &&
			pick.predictedSetsLost === match.setsLost;

		let pointsEarned = 0;
		if (isWinnerCorrect) {
			pointsEarned += pointsPerWinner;
		}
		if (isExactScore) {
			pointsEarned += pointsExactScore;
		}

		// Update the match pick
		await db
			.update(matchPicks)
			.set({
				isWinnerCorrect,
				isExactScore,
				pointsEarned,
			})
			.where(eq(matchPicks.id, pick.id));
	}

	// After updating all match picks, recalculate user round pick totals
	const userRoundPickIds = [...new Set(picks.map((p) => p.userRoundPickId))];

	for (const userRoundPickId of userRoundPickIds) {
		await recalculateUserRoundPickTotals(db, userRoundPickId);
	}
}

/**
 * Recalculate totals for a user round pick based on all its match picks
 */
export async function recalculateUserRoundPickTotals(
	db: NodePgDatabase<typeof schema>,
	userRoundPickId: number,
): Promise<void> {
	// Get all match picks for this user round pick
	const picks = await db.query.matchPicks.findMany({
		where: eq(matchPicks.userRoundPickId, userRoundPickId),
	});

	// Calculate totals
	const totalPoints = picks.reduce((sum, pick) => sum + pick.pointsEarned, 0);
	const correctWinners = picks.filter((pick) => pick.isWinnerCorrect).length;
	const exactScores = picks.filter((pick) => pick.isExactScore).length;

	// Update the user round pick
	await db
		.update(userRoundPicks)
		.set({
			totalPoints,
			correctWinners,
			exactScores,
			scoredAt: new Date(),
		})
		.where(eq(userRoundPicks.id, userRoundPickId));
}

/**
 * Recalculate scores for all picks in a round
 * Useful for re-scoring after rule changes or corrections
 */
export async function recalculateRoundScores(
	db: NodePgDatabase<typeof schema>,
	roundId: number,
): Promise<void> {
	// Get all finalized matches in this round
	const roundMatches = await db.query.matches.findMany({
		where: and(eq(matches.roundId, roundId), eq(matches.status, "finalized")),
	});

	// Recalculate scores for each match
	for (const match of roundMatches) {
		await calculateMatchPickScores(db, match.id);
	}
}

/**
 * Unfinalize a match and reset all related scores
 * Called when a match result needs to be corrected
 */
export async function unfinalizeMatchScores(
	db: NodePgDatabase<typeof schema>,
	matchId: number,
): Promise<void> {
	// Get all picks for this match before resetting
	const picks = await db.query.matchPicks.findMany({
		where: eq(matchPicks.matchId, matchId),
	});

	// Reset all match picks to unscored state
	await db
		.update(matchPicks)
		.set({
			isWinnerCorrect: null,
			isExactScore: null,
			pointsEarned: 0,
		})
		.where(eq(matchPicks.matchId, matchId));

	// Recalculate user round pick totals for all affected users
	const userRoundPickIds = [...new Set(picks.map((p) => p.userRoundPickId))];

	for (const userRoundPickId of userRoundPickIds) {
		await recalculateUserRoundPickTotals(db, userRoundPickId);
	}
}
