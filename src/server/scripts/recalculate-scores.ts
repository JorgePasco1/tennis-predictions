/**
 * One-time script to recalculate all existing pick scores
 * after updating the scoring rules.
 *
 * This updates:
 * - match_picks.points_earned for all scored picks
 * - user_round_picks.total_points, correct_winners, exact_scores
 *
 * Usage:
 *   pnpm tsx --env-file=.env src/server/scripts/recalculate-scores.ts
 */

import { eq } from "drizzle-orm";
import { recalculateRoundScores } from "~/server/services/scoring";
import { db } from "~/server/db";
import { matches, userRoundPicks } from "~/server/db/schema";

async function recalculateAllScores() {
	console.log("🔄 Starting score recalculation...\n");

	// Get all rounds with their scoring rules
	const allRounds = await db.query.rounds.findMany({
		with: {
			scoringRule: true,
		},
	});

	if (allRounds.length === 0) {
		console.log("ℹ️  No rounds found in the database.");
		return;
	}

	console.log(`📊 Found ${allRounds.length} rounds\n`);

	let totalPicksUpdated = 0;

	for (const round of allRounds) {
		if (!round.scoringRule) {
			console.log(`⚠️  ${round.name} has no scoring rule - skipping`);
			continue;
		}

		const { pointsPerWinner, pointsExactScore } = round.scoringRule;

		// Get all finalized matches in this round with their picks
		const roundMatches = await db.query.matches.findMany({
			where: eq(matches.roundId, round.id),
			with: {
				matchPicks: true,
			},
		});

		const finalizedMatches = roundMatches.filter(
			(m) => m.status === "finalized",
		);

		if (finalizedMatches.length === 0) {
			console.log(
				`⏭️  ${round.name}: No finalized matches (scoring: ${pointsPerWinner}/${pointsExactScore})`,
			);
			continue;
		}

		const roundPicksUpdated = finalizedMatches.reduce(
			(sum, match) => sum + match.matchPicks.length,
			0,
		);
		await recalculateRoundScores(db, round.id);

		totalPicksUpdated += roundPicksUpdated;
		if (roundPicksUpdated > 0) {
			console.log(
				`✅ ${round.name}: Updated ${roundPicksUpdated} picks (scoring: ${pointsPerWinner}/${pointsExactScore})`,
			);
		} else {
			console.log(
				`⏭️  ${round.name}: ${finalizedMatches.length} finalized matches, no picks to update`,
			);
		}
	}

	// Now recalculate all user_round_picks totals
	console.log("\n🔄 Recalculating user round pick totals...\n");

	const allUserRoundPicks = await db.query.userRoundPicks.findMany({
		with: {
			matchPicks: true,
		},
	});

	let totalUserRoundPicksUpdated = 0;

	for (const urp of allUserRoundPicks) {
		const totalPoints = urp.matchPicks.reduce(
			(sum, pick) => sum + pick.pointsEarned,
			0,
		);
		const correctWinners = urp.matchPicks.filter(
			(pick) => pick.isWinnerCorrect,
		).length;
		const exactScores = urp.matchPicks.filter(
			(pick) => pick.isExactScore,
		).length;

		// Only update if values changed
		if (
			urp.totalPoints !== totalPoints ||
			urp.correctWinners !== correctWinners ||
			urp.exactScores !== exactScores
		) {
			await db
				.update(userRoundPicks)
				.set({
					totalPoints,
					correctWinners,
					exactScores,
				})
				.where(eq(userRoundPicks.id, urp.id));
			totalUserRoundPicksUpdated++;
		}
	}

	console.log(`✅ Updated ${totalUserRoundPicksUpdated} user round picks\n`);

	console.log("✨ Score recalculation complete!");
	console.log(`   Match picks updated: ${totalPicksUpdated}`);
	console.log(`   User round picks updated: ${totalUserRoundPicksUpdated}`);
}

recalculateAllScores()
	.then(() => {
		console.log("\n✓ Script finished successfully");
		process.exit(0);
	})
	.catch((error) => {
		console.error("\n❌ Recalculation failed:");
		console.error(error);
		process.exit(1);
	});
