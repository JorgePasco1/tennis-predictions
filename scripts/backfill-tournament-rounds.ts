#!/usr/bin/env tsx
/**
 * Backfill missing rounds for tournament ID 2
 *
 * Creates rounds 3-7 and propagates winners from finalized matches
 *
 * Usage:
 *   pnpm tsx scripts/backfill-tournament-rounds.ts --dry-run  # Preview
 *   pnpm tsx scripts/backfill-tournament-rounds.ts            # Execute
 */

import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db } from "~/server/db";
import { matches, rounds, roundScoringRules } from "~/server/db/schema";
import { getScoringForRound } from "~/server/utils/scoring-config";

const TOURNAMENT_ID = 2;
const DRY_RUN = process.argv.includes("--dry-run");

interface RoundToCreate {
	roundNumber: number;
	name: string;
	matchCount: number;
}

const ROUNDS_TO_CREATE: RoundToCreate[] = [
	{ roundNumber: 3, name: "Round of 32", matchCount: 16 },
	{ roundNumber: 4, name: "Round of 16", matchCount: 8 },
	{ roundNumber: 5, name: "Quarter Finals", matchCount: 4 },
	{ roundNumber: 6, name: "Semi Finals", matchCount: 2 },
	{ roundNumber: 7, name: "Final", matchCount: 1 },
];

async function validateCurrentState() {
	console.log("🔍 Validating current state...\n");

	// Query tournament with all rounds and matches
	const tournament = await db.query.tournaments.findFirst({
		where: (tournaments, { eq }) => eq(tournaments.id, TOURNAMENT_ID),
		with: {
			rounds: {
				orderBy: (rounds, { asc }) => [asc(rounds.roundNumber)],
				with: {
					matches: {
						orderBy: (matches, { asc }) => [asc(matches.matchNumber)],
					},
				},
			},
		},
	});

	if (!tournament) {
		throw new Error(`Tournament ID ${TOURNAMENT_ID} not found!`);
	}

	console.log(`Tournament: ${tournament.name} (ID: ${tournament.id})`);
	console.log(`Status: ${tournament.status}`);
	console.log(`Format: ${tournament.format}`);
	console.log(`Current Round Number: ${tournament.currentRoundNumber ?? "N/A"}`);
	console.log("");

	// Verify we have exactly 2 rounds
	if (tournament.rounds.length !== 2) {
		throw new Error(
			`Expected 2 existing rounds, found ${tournament.rounds.length}`,
		);
	}

	// Verify round structure
	const [r128, r64] = tournament.rounds;
	if (!r128 || !r64) {
		throw new Error("Expected R128 and R64 rounds");
	}

	console.log(`Existing Rounds:`);
	console.log(`  ✓ Round ${r128.roundNumber}: ${r128.name}`);
	console.log(`    - Matches: ${r128.matches.length}`);
	console.log(`    - Active: ${r128.isActive}`);
	console.log(`    - Finalized: ${r128.isFinalized}`);

	const r64FinalizedCount = r64.matches.filter(
		(m) => m.status === "finalized",
	).length;
	const r64PendingCount = r64.matches.filter(
		(m) => m.status === "pending",
	).length;

	console.log(`  ✓ Round ${r64.roundNumber}: ${r64.name}`);
	console.log(`    - Matches: ${r64.matches.length}`);
	console.log(`    - Active: ${r64.isActive}`);
	console.log(`    - Finalized: ${r64.isFinalized}`);
	console.log(`    - Finalized matches: ${r64FinalizedCount}`);
	console.log(`    - Pending matches: ${r64PendingCount}`);
	console.log("");

	if (r64FinalizedCount === 0) {
		console.log(
			"⚠️  Warning: No finalized matches in R64. No winners will be propagated.",
		);
		console.log("");
	}

	return { tournament, r64, r64FinalizedCount };
}

async function executeBackfill() {
	console.log("🎾 Backfill Tournament Rounds Script\n");
	console.log(`${"=".repeat(50)}\n`);

	if (DRY_RUN) {
		console.log("🔍 DRY RUN MODE - No changes will be made\n");
	}

	// Phase 1: Validation
	const { tournament, r64, r64FinalizedCount } = await validateCurrentState();

	if (DRY_RUN) {
		console.log("📋 Planned Changes:\n");
		console.log("Missing rounds to create:");
		for (const round of ROUNDS_TO_CREATE) {
			const scoring = getScoringForRound(round.name);
			console.log(
				`  → Round ${round.roundNumber}: ${round.name} (${round.matchCount} matches)`,
			);
			console.log(
				`    Scoring: ${scoring.pointsPerWinner} pts/winner, ${scoring.pointsExactScore} pts/exact`,
			);
		}
		console.log("");
		console.log(`Winner Propagation:`);
		console.log(
			`  → ${Math.floor(r64FinalizedCount / 2)} R32 matches will receive winners from R64`,
		);
		console.log(
			`  → ${16 - Math.floor(r64FinalizedCount / 2)} R32 matches will remain TBD`,
		);
		console.log("");
		console.log("✅ Dry run complete. Run without --dry-run to execute.");
		return;
	}

	// Phase 2: Transaction - Create Rounds & Matches
	console.log("📝 Creating missing rounds and matches...\n");

	await db.transaction(async (tx) => {
		// Create all rounds first
		const insertedRounds = await tx
			.insert(rounds)
			.values(
				ROUNDS_TO_CREATE.map((r) => ({
					tournamentId: TOURNAMENT_ID,
					roundNumber: r.roundNumber,
					name: r.name,
					isActive: false,
					isFinalized: false,
				})),
			)
			.returning();

		console.log(`✓ Created ${insertedRounds.length} rounds`);

		// Create scoring rules for each round
		const scoringRules = insertedRounds.map((round) => {
			const scoring = getScoringForRound(round.name);
			return {
				roundId: round.id,
				pointsPerWinner: scoring.pointsPerWinner,
				pointsExactScore: scoring.pointsExactScore,
			};
		});

		await tx.insert(roundScoringRules).values(scoringRules);
		console.log(`✓ Created ${scoringRules.length} scoring rules`);

		// Create all matches with TBD placeholders
		const allMatches = insertedRounds.flatMap((round) => {
			const roundConfig = ROUNDS_TO_CREATE.find(
				(r) => r.roundNumber === round.roundNumber,
			);
			if (!roundConfig) return [];

			return Array.from({ length: roundConfig.matchCount }, (_, i) => ({
				roundId: round.id,
				matchNumber: i + 1,
				player1Name: "TBD",
				player2Name: "TBD",
				status: "pending" as const,
			}));
		});

		await tx.insert(matches).values(allMatches);
		console.log(
			`✓ Created ${allMatches.length} matches (all with TBD placeholders)`,
		);
		console.log("");

		// Phase 3: Winner Propagation from R64 to R32
		console.log("🏆 Propagating winners from R64 to R32...\n");

		// Get all finalized matches from R64
		const r64FinalizedMatches = r64.matches.filter(
			(m) => m.status === "finalized" && m.winnerName,
		);

		if (r64FinalizedMatches.length === 0) {
			console.log("ℹ️  No winners to propagate (no finalized matches in R64)");
			console.log("");
			return;
		}

		// Find the R32 round we just created
		const r32Round = insertedRounds.find((r) => r.roundNumber === 3);
		if (!r32Round) {
			throw new Error("R32 round not found after creation");
		}

		// Collect all winner updates
		type WinnerUpdate = {
			targetMatchNumber: number;
			playerSlot: "player1" | "player2";
			winnerName: string;
			winnerSeed: number | null;
		};

		const winnerUpdates: WinnerUpdate[] = [];

		for (const finalizedMatch of r64FinalizedMatches) {
			if (!finalizedMatch.winnerName) continue;

			// Calculate which match in R32 this winner goes to
			const nextMatchNumber = Math.ceil(finalizedMatch.matchNumber / 2);

			// Odd match → player1, Even match → player2
			const playerSlot =
				finalizedMatch.matchNumber % 2 === 1 ? "player1" : "player2";

			// Determine the winner's seed
			const winnerSeed =
				finalizedMatch.winnerName === finalizedMatch.player1Name
					? finalizedMatch.player1Seed
					: finalizedMatch.player2Seed;

			winnerUpdates.push({
				targetMatchNumber: nextMatchNumber,
				playerSlot,
				winnerName: finalizedMatch.winnerName,
				winnerSeed,
			});

			console.log(
				`  R64 Match ${finalizedMatch.matchNumber}: ${finalizedMatch.winnerName} → R32 Match ${nextMatchNumber} (${playerSlot})`,
			);
		}

		console.log("");

		// Execute bulk update using SQL CASE statements
		if (winnerUpdates.length > 0) {
			// Separate updates by player slot
			const player1Updates = winnerUpdates.filter(
				(u) => u.playerSlot === "player1",
			);
			const player2Updates = winnerUpdates.filter(
				(u) => u.playerSlot === "player2",
			);

			// Build update object dynamically
			const updateFields: Record<string, unknown> = {};

			if (player1Updates.length > 0) {
				const player1NameCases = player1Updates
					.map(
						(u) =>
							sql`WHEN ${matches.matchNumber} = ${u.targetMatchNumber} THEN ${u.winnerName}`,
					)
					.reduce((acc, curr) => sql`${acc} ${curr}`, sql``);

				const player1SeedCases = player1Updates
					.map(
						(u) =>
							sql`WHEN ${matches.matchNumber} = ${u.targetMatchNumber} THEN ${u.winnerSeed}`,
					)
					.reduce((acc, curr) => sql`${acc} ${curr}`, sql``);

				updateFields.player1Name = sql`CASE ${player1NameCases} ELSE ${matches.player1Name} END`;
				updateFields.player1Seed = sql`CASE ${player1SeedCases} ELSE ${matches.player1Seed} END`;
			}

			if (player2Updates.length > 0) {
				const player2NameCases = player2Updates
					.map(
						(u) =>
							sql`WHEN ${matches.matchNumber} = ${u.targetMatchNumber} THEN ${u.winnerName}`,
					)
					.reduce((acc, curr) => sql`${acc} ${curr}`, sql``);

				const player2SeedCases = player2Updates
					.map(
						(u) =>
							sql`WHEN ${matches.matchNumber} = ${u.targetMatchNumber} THEN ${u.winnerSeed}`,
					)
					.reduce((acc, curr) => sql`${acc} ${curr}`, sql``);

				updateFields.player2Name = sql`CASE ${player2NameCases} ELSE ${matches.player2Name} END`;
				updateFields.player2Seed = sql`CASE ${player2SeedCases} ELSE ${matches.player2Seed} END`;
			}

			if (Object.keys(updateFields).length > 0) {
				await tx
					.update(matches)
					.set(updateFields)
					.where(eq(matches.roundId, r32Round.id));

				console.log(`✓ Updated ${winnerUpdates.length} player slots in R32`);
			}
		}

		const matchesWithPlayers = Math.floor(r64FinalizedMatches.length / 2);
		const matchesWithTBD = 16 - matchesWithPlayers;

		console.log(`✓ R32 Status: ${matchesWithPlayers} matches with players`);
		if (matchesWithTBD > 0) {
			console.log(
				`ℹ️  R32 Status: ${matchesWithTBD} matches remain TBD (waiting for R64 completion)`,
			);
		}
		console.log("");
	});

	// Phase 4: Final Validation
	console.log("✅ Verifying final state...\n");

	const updatedTournament = await db.query.tournaments.findFirst({
		where: (tournaments, { eq }) => eq(tournaments.id, TOURNAMENT_ID),
		with: {
			rounds: {
				orderBy: (rounds, { asc }) => [asc(rounds.roundNumber)],
				with: {
					matches: true,
				},
			},
		},
	});

	if (!updatedTournament) {
		throw new Error("Tournament not found after update");
	}

	const totalMatches = updatedTournament.rounds.reduce(
		(sum, r) => sum + r.matches.length,
		0,
	);

	console.log("Final State:");
	console.log(`  ✓ Total rounds: ${updatedTournament.rounds.length}`);
	console.log(`  ✓ Total matches: ${totalMatches}`);
	console.log("");

	const r32 = updatedTournament.rounds.find((r) => r.roundNumber === 3);
	if (r32) {
		const matchesWithPlayers = r32.matches.filter(
			(m) => m.player1Name !== "TBD" || m.player2Name !== "TBD",
		).length;
		const matchesWithTBD = r32.matches.filter(
			(m) => m.player1Name === "TBD" && m.player2Name === "TBD",
		).length;

		console.log("R32 Details:");
		console.log(`  ✓ Matches with players: ${matchesWithPlayers}`);
		console.log(`  ✓ Matches with TBD: ${matchesWithTBD}`);
		console.log("");
	}

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
