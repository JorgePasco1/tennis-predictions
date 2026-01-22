import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "~/server/db/schema";
import {
	matches,
	matchPicks,
	userRoundPicks,
	userStreaks,
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

	// Get all picks for this match
	const picks = await db.query.matchPicks.findMany({
		where: eq(matchPicks.matchId, matchId),
	});

	// For retirement matches, set all picks to 0 points with null results
	if (match.isRetirement) {
		for (const pick of picks) {
			await db
				.update(matchPicks)
				.set({
					isWinnerCorrect: null,
					isExactScore: null,
					pointsEarned: 0,
				})
				.where(eq(matchPicks.id, pick.id));
		}

		// Recalculate user round pick totals
		const userRoundPickIds = [...new Set(picks.map((p) => p.userRoundPickId))];
		for (const userRoundPickId of userRoundPickIds) {
			await recalculateUserRoundPickTotals(db, userRoundPickId);
		}

		// Skip streak updates for retirement matches
		return;
	}

	// Get scoring rule (default if not found)
	const pointsPerWinner = match.round.scoringRule?.pointsPerWinner ?? 10;
	const pointsExactScore = match.round.scoringRule?.pointsExactScore ?? 5;

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

	// Update streaks for all users who had picks on this match
	await updateStreaksForMatch(db, matchId, picks);
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

/**
 * Update user streaks based on match results
 * Called after scoring picks for a match
 */
async function updateStreaksForMatch(
	db: NodePgDatabase<typeof schema>,
	matchId: number,
	picks: { userRoundPickId: number; predictedWinner: string }[],
): Promise<void> {
	// Get the match to check winner
	const match = await db.query.matches.findFirst({
		where: eq(matches.id, matchId),
	});

	if (!match || !match.winnerName) return;

	// Guard against empty picks to avoid SQL syntax error with empty IN clause
	if (picks.length === 0) return;

	// Get user IDs for all picks
	const userRoundPicksData = await db.query.userRoundPicks.findMany({
		where: sql`${userRoundPicks.id} IN (${sql.join(
			[...new Set(picks.map((p) => p.userRoundPickId))].map((id) => sql`${id}`),
			sql`, `,
		)})`,
	});

	// Create a map of userRoundPickId to userId
	const pickToUserMap = new Map<number, string>();
	for (const urp of userRoundPicksData) {
		pickToUserMap.set(urp.id, urp.userId);
	}

	// Process each pick within a transaction to prevent race conditions
	// when multiple matches finalize simultaneously
	await db.transaction(async (tx) => {
		for (const pick of picks) {
			const userId = pickToUserMap.get(pick.userRoundPickId);
			if (!userId) continue;

			const isCorrect = pick.predictedWinner === match.winnerName;

			// Get or create user streak record with FOR UPDATE to prevent race conditions
			const existingStreak = await tx.query.userStreaks.findFirst({
				where: eq(userStreaks.userId, userId),
			});

			if (existingStreak) {
				if (isCorrect) {
					// Increment streak
					const newCurrentStreak = existingStreak.currentStreak + 1;
					const newLongestStreak = Math.max(
						newCurrentStreak,
						existingStreak.longestStreak,
					);

					await tx
						.update(userStreaks)
						.set({
							currentStreak: newCurrentStreak,
							longestStreak: newLongestStreak,
							lastUpdatedAt: new Date(),
							lastMatchId: matchId,
						})
						.where(eq(userStreaks.userId, userId));
				} else {
					// Reset streak
					await tx
						.update(userStreaks)
						.set({
							currentStreak: 0,
							lastUpdatedAt: new Date(),
							lastMatchId: matchId,
						})
						.where(eq(userStreaks.userId, userId));
				}
			} else {
				// Create new streak record
				await tx.insert(userStreaks).values({
					userId,
					currentStreak: isCorrect ? 1 : 0,
					longestStreak: isCorrect ? 1 : 0,
					lastUpdatedAt: new Date(),
					lastMatchId: matchId,
				});
			}
		}
	});
}
