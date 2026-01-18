/**
 * One-time migration script to update existing tournaments
 * with progressive scoring rules
 *
 * Safe to run since no matches have been finalized yet.
 *
 * Usage:
 *   pnpm tsx --env-file=.env src/server/scripts/migrate-scoring.ts
 */

import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { roundScoringRules } from "~/server/db/schema";
import { getScoringForRound } from "~/server/utils/scoring-config";

async function migrateExistingScoring() {
	console.log("🔄 Starting migration of scoring rules...\n");

	// Get all rounds with their current scoring rules
	const allRounds = await db.query.rounds.findMany({
		with: { scoringRule: true },
	});

	if (allRounds.length === 0) {
		console.log("ℹ️  No rounds found in the database.");
		return;
	}

	console.log(`📊 Found ${allRounds.length} rounds to migrate\n`);

	let updated = 0;
	let skipped = 0;

	for (const round of allRounds) {
		const newScoring = getScoringForRound(round.name);

		if (round.scoringRule) {
			// Check if scoring already matches (skip if already migrated)
			if (
				round.scoringRule.pointsPerWinner === newScoring.pointsPerWinner &&
				round.scoringRule.pointsExactScore === newScoring.pointsExactScore
			) {
				console.log(
					`⏭️  Skipped ${round.name} (already has correct scoring: ${newScoring.pointsPerWinner}/${newScoring.pointsExactScore})`,
				);
				skipped++;
				continue;
			}

			// Update existing scoring rule
			await db
				.update(roundScoringRules)
				.set({
					pointsPerWinner: newScoring.pointsPerWinner,
					pointsExactScore: newScoring.pointsExactScore,
				})
				.where(eq(roundScoringRules.id, round.scoringRule.id));

			console.log(
				`✅ Updated ${round.name}: ${round.scoringRule.pointsPerWinner}/${round.scoringRule.pointsExactScore} → ${newScoring.pointsPerWinner}/${newScoring.pointsExactScore} pts`,
			);
			updated++;
		} else {
			console.log(`⚠️  Warning: ${round.name} has no scoring rule - skipping`);
			skipped++;
		}
	}

	console.log(`\n✨ Migration complete!`);
	console.log(`   Updated: ${updated} rounds`);
	console.log(`   Skipped: ${skipped} rounds`);

	if (updated > 0) {
		console.log(
			"\n💡 Tip: New tournaments will automatically use progressive scoring.",
		);
	}
}

migrateExistingScoring()
	.then(() => {
		console.log("\n✓ Script finished successfully");
		process.exit(0);
	})
	.catch((error) => {
		console.error("\n❌ Migration failed:");
		console.error(error);
		process.exit(1);
	});
