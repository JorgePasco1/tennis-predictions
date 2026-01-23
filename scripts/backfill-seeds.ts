#!/usr/bin/env tsx
/**
 * Backfill missing seeds for tournament brackets
 *
 * Seeds are correctly displayed in R128 but missing in all subsequent rounds.
 * This script propagates seeds from finalized matches to the next round sequentially.
 *
 * Usage:
 *   pnpm tsx scripts/backfill-seeds.ts --dry-run  # Preview changes
 *   pnpm tsx scripts/backfill-seeds.ts            # Execute backfill
 *   pnpm tsx scripts/backfill-seeds.ts --tournament-id 3  # Specific tournament
 */

import "dotenv/config";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "~/server/db";
import { matches } from "~/server/db/schema";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const TOURNAMENT_ID = (() => {
	const idIndex = args.indexOf("--tournament-id");
	const idValue = args[idIndex + 1];
	if (idIndex !== -1 && idValue) {
		return Number.parseInt(idValue, 10);
	}
	return 2; // Default to Australian Open 2025
})();

interface Match {
	id: number;
	roundId: number;
	matchNumber: number;
	player1Name: string;
	player1Seed: number | null;
	player2Name: string;
	player2Seed: number | null;
	winnerName: string | null;
	status: "pending" | "finalized";
}

interface Round {
	id: number;
	roundNumber: number;
	name: string;
	isFinalized: boolean;
	matches: Match[];
}

interface SeedUpdate {
	targetMatchNumber: number;
	playerSlot: "player1" | "player2";
	winnerSeed: number | null;
	fromMatchNumber: number;
	winnerName: string;
}

async function queryTournamentData() {
	const tournament = await db.query.tournaments.findFirst({
		where: (tournaments, { eq }) => eq(tournaments.id, TOURNAMENT_ID),
		with: {
			rounds: {
				orderBy: (rounds, { asc }) => [asc(rounds.roundNumber)],
				with: {
					matches: {
						where: (matches, { isNull }) => isNull(matches.deletedAt),
						orderBy: (matches, { asc }) => [asc(matches.matchNumber)],
					},
				},
			},
		},
	});

	if (!tournament) {
		throw new Error(`Tournament ID ${TOURNAMENT_ID} not found!`);
	}

	return tournament;
}

function analyzeSeedDistribution(rounds: Round[]) {
	console.log("📊 Current Seed Distribution:\n");

	for (const round of rounds) {
		const player1Seeds = round.matches.filter(
			(m) => m.player1Seed !== null,
		).length;
		const player2Seeds = round.matches.filter(
			(m) => m.player2Seed !== null,
		).length;
		const totalMatches = round.matches.length;
		const totalSeeds = player1Seeds + player2Seeds;
		const maxPossibleSeeds = totalMatches * 2;

		const status =
			totalSeeds === 0 ? "❌" : totalSeeds === maxPossibleSeeds ? "✅" : "⚠️";

		console.log(`  ${status} Round ${round.roundNumber}: ${round.name}`);
		console.log(
			`     ${totalMatches} matches, ${player1Seeds} player1_seeds, ${player2Seeds} player2_seeds`,
		);
	}
	console.log("");
}

function calculateSeedUpdatesForRound(
	currentRound: Round,
	nextRound: Round | undefined,
): SeedUpdate[] {
	if (!nextRound) {
		return [];
	}

	const updates: SeedUpdate[] = [];

	// Find all finalized matches with winners
	const finalizedMatches = currentRound.matches.filter(
		(m) => m.status === "finalized" && m.winnerName,
	);

	for (const match of finalizedMatches) {
		if (!match.winnerName) continue;

		// Determine the winner's seed
		const winnerSeed =
			match.winnerName === match.player1Name
				? match.player1Seed
				: match.player2Seed;

		// Only propagate if there's a seed to propagate
		if (winnerSeed === null) continue;

		// Calculate which match in next round this winner goes to
		const nextMatchNumber = Math.ceil(match.matchNumber / 2);

		// Odd match → player1, Even match → player2
		const playerSlot = match.matchNumber % 2 === 1 ? "player1" : "player2";

		updates.push({
			targetMatchNumber: nextMatchNumber,
			playerSlot,
			winnerSeed,
			fromMatchNumber: match.matchNumber,
			winnerName: match.winnerName,
		});
	}

	return updates;
}

function logPlannedUpdates(
	currentRound: Round,
	nextRound: Round,
	updates: SeedUpdate[],
) {
	if (updates.length === 0) {
		console.log(`  ℹ️  No seeds to propagate (no seeded winners found)`);
		return;
	}

	console.log(`  📋 ${updates.length} seeds to propagate:`);
	for (const update of updates.slice(0, 10)) {
		// Show first 10
		const seedStr = update.winnerSeed
			? `seed=${update.winnerSeed}`
			: "unseeded";
		console.log(
			`     Match ${update.fromMatchNumber}: (${update.winnerSeed}) ${update.winnerName} → Match ${update.targetMatchNumber} (${update.playerSlot}) ${seedStr}`,
		);
	}
	if (updates.length > 10) {
		console.log(`     ... and ${updates.length - 10} more`);
	}
}

async function applySeedUpdates(
	nextRound: Round,
	updates: SeedUpdate[],
	tx: { update: typeof db.update },
) {
	if (updates.length === 0) {
		return;
	}

	// Separate updates by player slot
	const player1Updates = updates.filter((u) => u.playerSlot === "player1");
	const player2Updates = updates.filter((u) => u.playerSlot === "player2");

	// Build update object dynamically
	const updateFields: Record<string, unknown> = {};

	if (player1Updates.length > 0) {
		const player1SeedCases = player1Updates
			.map(
				(u) =>
					sql`WHEN ${matches.matchNumber} = ${u.targetMatchNumber} THEN ${u.winnerSeed}`,
			)
			.reduce((acc, curr) => sql`${acc} ${curr}`, sql``);

		updateFields.player1Seed = sql`CASE ${player1SeedCases} ELSE ${matches.player1Seed} END`;
	}

	if (player2Updates.length > 0) {
		const player2SeedCases = player2Updates
			.map(
				(u) =>
					sql`WHEN ${matches.matchNumber} = ${u.targetMatchNumber} THEN ${u.winnerSeed}`,
			)
			.reduce((acc, curr) => sql`${acc} ${curr}`, sql``);

		updateFields.player2Seed = sql`CASE ${player2SeedCases} ELSE ${matches.player2Seed} END`;
	}

	if (Object.keys(updateFields).length > 0) {
		await tx
			.update(matches)
			.set(updateFields)
			.where(eq(matches.roundId, nextRound.id));

		console.log(`  ✅ Updated ${updates.length} seed(s) in ${nextRound.name}`);
	}
}

async function executeBackfill() {
	console.log("🎾 Seed Backfill Script\n");
	console.log(`${"=".repeat(50)}\n`);

	// Query tournament
	let tournament = await queryTournamentData();

	console.log(`Tournament: ${tournament.name} (ID: ${tournament.id})`);
	console.log(`Status: ${tournament.status}`);
	console.log("");

	if (DRY_RUN) {
		console.log("🔍 DRY RUN MODE - No changes will be made\n");
	}

	// Analyze current state
	analyzeSeedDistribution(tournament.rounds);

	// Calculate all updates (for preview)
	console.log("🔄 Planned Propagation:\n");

	const allRoundUpdates: Array<{
		currentRound: Round;
		nextRound: Round;
		updates: SeedUpdate[];
	}> = [];

	for (let i = 0; i < tournament.rounds.length - 1; i++) {
		const currentRound = tournament.rounds[i];
		const nextRound = tournament.rounds[i + 1];

		if (!currentRound || !nextRound) continue;

		const updates = calculateSeedUpdatesForRound(currentRound, nextRound);

		console.log(`${currentRound.name} → ${nextRound.name}:`);
		logPlannedUpdates(currentRound, nextRound, updates);
		console.log("");

		allRoundUpdates.push({ currentRound, nextRound, updates });
	}

	const totalUpdates = allRoundUpdates.reduce(
		(sum, r) => sum + r.updates.length,
		0,
	);

	console.log(
		`📈 Total (from current state): ${totalUpdates} seeds to propagate\n`,
	);
	console.log(
		"ℹ️  Note: More seeds may be propagated after each round is updated\n",
	);

	if (DRY_RUN) {
		console.log("✅ Dry run complete. Run without --dry-run to execute.");
		return;
	}

	// Execute updates sequentially, re-querying after each round
	console.log("📝 Executing updates sequentially...\n");

	let totalApplied = 0;

	for (let i = 0; i < tournament.rounds.length - 1; i++) {
		const currentRound = tournament.rounds[i];
		const nextRound = tournament.rounds[i + 1];

		if (!currentRound || !nextRound) continue;

		const updates = calculateSeedUpdatesForRound(currentRound, nextRound);

		if (updates.length > 0) {
			console.log(`🔄 ${currentRound.name} → ${nextRound.name}:`);

			await db.transaction(async (tx) => {
				await applySeedUpdates(nextRound, updates, tx);
			});

			totalApplied += updates.length;

			// Re-query tournament to get updated seed data for next iteration
			tournament = await queryTournamentData();
		}
	}

	console.log("");
	console.log(`✅ Applied ${totalApplied} seed updates in total\n`);

	// Verify final state
	console.log("✅ Verifying final state...\n");

	const updatedTournament = await queryTournamentData();
	analyzeSeedDistribution(updatedTournament.rounds);

	console.log("✅ Backfill complete!\n");
}

async function main() {
	try {
		await executeBackfill();
		process.exit(0);
	} catch (error) {
		console.error("\n❌ Error:", error);
		if (error instanceof Error) {
			console.error(error.stack);
		}
		process.exit(1);
	}
}

main();
