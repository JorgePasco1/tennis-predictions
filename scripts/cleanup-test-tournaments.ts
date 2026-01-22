#!/usr/bin/env tsx
/**
 * Cleanup script for test tournaments
 *
 * This script helps you identify and remove test tournaments from the database.
 *
 * Usage:
 *   pnpm tsx scripts/cleanup-test-tournaments.ts list                    # List all test tournaments
 *   pnpm tsx scripts/cleanup-test-tournaments.ts soft-delete             # Soft delete test tournaments
 *   pnpm tsx scripts/cleanup-test-tournaments.ts hard-delete             # PERMANENTLY delete test tournaments
 *   pnpm tsx scripts/cleanup-test-tournaments.ts delete-by-id <id>       # PERMANENTLY delete tournament by ID
 *
 * Test tournament patterns (case-insensitive):
 *   - Contains "test"
 *   - Contains "demo"
 *   - Contains "sample"
 *   - Starts with "zzz"
 *   - Starts with "temp"
 */

import "dotenv/config";
import { and, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "~/server/db";
import {
	matchPicks,
	matches,
	roundScoringRules,
	rounds,
	tournaments,
	userAchievements,
	userRoundPicks,
	userStreaks,
} from "~/server/db/schema";

const TEST_PATTERNS = ["%test%", "%demo%", "%sample%", "zzz%", "temp%"];

async function listTestTournaments() {
	const testTournaments = await db.query.tournaments.findMany({
		where: or(
			...TEST_PATTERNS.map((pattern) => ilike(tournaments.name, pattern)),
		),
		with: {
			rounds: {
				with: {
					userRoundPicks: true,
					matches: true,
				},
			},
		},
	});

	if (testTournaments.length === 0) {
		console.log("✅ No test tournaments found!");
		return [];
	}

	console.log(`\n📋 Found ${testTournaments.length} test tournament(s):\n`);

	for (const tournament of testTournaments) {
		const totalPicks = tournament.rounds.reduce(
			(sum, round) => sum + round.userRoundPicks.length,
			0,
		);
		const totalMatches = tournament.rounds.reduce(
			(sum, round) => sum + round.matches.length,
			0,
		);
		const isDeleted = tournament.deletedAt !== null;

		console.log(`  ID: ${tournament.id}`);
		console.log(`  Name: ${tournament.name}`);
		console.log(
			`  Status: ${tournament.status}${isDeleted ? " (DELETED)" : ""}`,
		);
		console.log(`  Rounds: ${tournament.rounds.length}`);
		console.log(`  Matches: ${totalMatches}`);
		console.log(`  User Picks: ${totalPicks}`);
		console.log(`  Created: ${tournament.createdAt.toISOString()}`);
		console.log("");
	}

	return testTournaments;
}

async function softDeleteTestTournaments() {
	console.log("🔍 Finding test tournaments to soft delete...\n");

	const testTournaments = await db.query.tournaments.findMany({
		where: and(
			or(...TEST_PATTERNS.map((pattern) => ilike(tournaments.name, pattern))),
			isNull(tournaments.deletedAt), // Only non-deleted ones
		),
		with: {
			rounds: {
				with: {
					userRoundPicks: true,
					matches: true,
				},
			},
		},
	});

	if (testTournaments.length === 0) {
		console.log("✅ No test tournaments to soft delete!");
		return;
	}

	console.log(
		`Found ${testTournaments.length} test tournament(s) to soft delete\n`,
	);

	for (const tournament of testTournaments) {
		const totalPicks = tournament.rounds.reduce(
			(sum, round) => sum + round.userRoundPicks.length,
			0,
		);

		console.log(`  Soft deleting: ${tournament.name} (ID: ${tournament.id})`);
		console.log(`    - ${tournament.rounds.length} rounds`);
		console.log(`    - ${totalPicks} user picks (will be preserved)`);

		// Soft delete the tournament
		await db
			.update(tournaments)
			.set({ deletedAt: new Date() })
			.where(sql`${tournaments.id} = ${tournament.id}`);

		// Soft delete all associated matches
		const roundIds = tournament.rounds.map((r) => r.id);
		if (roundIds.length > 0) {
			await db
				.update(matches)
				.set({ deletedAt: new Date() })
				.where(
					sql`${matches.roundId} IN ${sql.raw(`(${roundIds.join(",")})`)}`,
				);
		}

		console.log(`    ✅ Soft deleted\n`);
	}

	console.log(
		`\n✅ Soft deleted ${testTournaments.length} test tournament(s)!`,
	);
	console.log(
		"💡 Data is still in the database and can be restored if needed.\n",
	);
}

async function hardDeleteTestTournaments() {
	console.log("⚠️  HARD DELETE - THIS WILL PERMANENTLY REMOVE DATA!\n");
	console.log("🔍 Finding test tournaments...\n");

	const testTournaments = await db.query.tournaments.findMany({
		where: or(
			...TEST_PATTERNS.map((pattern) => ilike(tournaments.name, pattern)),
		),
		with: {
			rounds: {
				with: {
					userRoundPicks: true,
					matches: true,
				},
			},
		},
	});

	if (testTournaments.length === 0) {
		console.log("✅ No test tournaments to delete!");
		return;
	}

	console.log(
		`Found ${testTournaments.length} test tournament(s) to PERMANENTLY delete:\n`,
	);

	for (const tournament of testTournaments) {
		const totalPicks = tournament.rounds.reduce(
			(sum, round) => sum + round.userRoundPicks.length,
			0,
		);
		const totalMatches = tournament.rounds.reduce(
			(sum, round) => sum + round.matches.length,
			0,
		);

		console.log(`  ❌ DELETING: ${tournament.name} (ID: ${tournament.id})`);
		console.log(`    - ${tournament.rounds.length} rounds`);
		console.log(`    - ${totalMatches} matches`);
		console.log(`    - ${totalPicks} user picks`);

		const roundIds = tournament.rounds.map((r) => r.id);
		const matchIds = tournament.rounds.flatMap((r) =>
			r.matches.map((m) => m.id),
		);

		// Delete in order respecting foreign key constraints:
		// 1. Match picks
		if (matchIds.length > 0) {
			await db
				.delete(matchPicks)
				.where(
					sql`${matchPicks.matchId} IN ${sql.raw(`(${matchIds.join(",")})`)}`,
				);
		}

		// 2. User streaks
		if (matchIds.length > 0) {
			await db
				.delete(userStreaks)
				.where(
					sql`${userStreaks.lastMatchId} IN ${sql.raw(`(${matchIds.join(",")})`)}`,
				);
		}

		// 3. Matches
		if (roundIds.length > 0) {
			await db
				.delete(matches)
				.where(
					sql`${matches.roundId} IN ${sql.raw(`(${roundIds.join(",")})`)}`,
				);
		}

		// 4. User round picks
		if (roundIds.length > 0) {
			await db
				.delete(userRoundPicks)
				.where(
					sql`${userRoundPicks.roundId} IN ${sql.raw(`(${roundIds.join(",")})`)}`,
				);
		}

		// 5. Round scoring rules
		if (roundIds.length > 0) {
			await db
				.delete(roundScoringRules)
				.where(
					sql`${roundScoringRules.roundId} IN ${sql.raw(`(${roundIds.join(",")})`)}`,
				);
		}

		// 6. User achievements
		if (roundIds.length > 0) {
			await db
				.delete(userAchievements)
				.where(
					sql`${userAchievements.roundId} IN ${sql.raw(`(${roundIds.join(",")})`)}`,
				);
		}

		// 7. Rounds
		if (roundIds.length > 0) {
			await db
				.delete(rounds)
				.where(sql`${rounds.id} IN ${sql.raw(`(${roundIds.join(",")})`)}`);
		}

		// 8. Tournament
		await db
			.delete(tournaments)
			.where(sql`${tournaments.id} = ${tournament.id}`);

		console.log(`    ✅ Permanently deleted\n`);
	}

	console.log(
		`\n✅ Permanently deleted ${testTournaments.length} test tournament(s)!`,
	);
	console.log("⚠️  This action cannot be undone.\n");
}

async function deleteById(tournamentId: number) {
	console.log("⚠️  HARD DELETE BY ID - PERMANENT REMOVAL\n");
	console.log(`🔍 Looking up tournament ID: ${tournamentId}...\n`);

	// Look up the tournament (including soft-deleted ones)
	const tournament = await db.query.tournaments.findFirst({
		where: sql`${tournaments.id} = ${tournamentId}`,
		with: {
			rounds: {
				with: {
					userRoundPicks: true,
					matches: true,
				},
			},
		},
	});

	if (!tournament) {
		console.log(`❌ Tournament with ID ${tournamentId} not found!\n`);
		process.exit(1);
	}

	const totalPicks = tournament.rounds.reduce(
		(sum, round) => sum + round.userRoundPicks.length,
		0,
	);
	const totalMatches = tournament.rounds.reduce(
		(sum, round) => sum + round.matches.length,
		0,
	);
	const isDeleted = tournament.deletedAt !== null;

	console.log("📋 Tournament Details:\n");
	console.log(`  ID: ${tournament.id}`);
	console.log(`  Name: ${tournament.name}`);
	console.log(`  Status: ${tournament.status}${isDeleted ? " (SOFT DELETED)" : ""}`);
	console.log(`  Rounds: ${tournament.rounds.length}`);
	console.log(`  Matches: ${totalMatches}`);
	console.log(`  User Picks: ${totalPicks}`);
	console.log("");

	console.log("⚠️  THIS WILL PERMANENTLY DELETE:");
	console.log(`  - The tournament: ${tournament.name}`);
	console.log(`  - ${tournament.rounds.length} rounds`);
	console.log(`  - ${totalMatches} matches`);
	console.log(`  - ${totalPicks} user picks`);
	console.log("\n⚠️  THIS CANNOT BE UNDONE!\n");
	console.log("To confirm, please run:");
	console.log(
		`  pnpm tsx scripts/cleanup-test-tournaments.ts delete-by-id-confirm ${tournamentId}\n`,
	);
}

async function deleteByIdConfirm(tournamentId: number) {
	console.log("⚠️  HARD DELETE BY ID - PERMANENT REMOVAL\n");
	console.log(`🔍 Looking up tournament ID: ${tournamentId}...\n`);

	// Look up the tournament (including soft-deleted ones)
	const tournament = await db.query.tournaments.findFirst({
		where: sql`${tournaments.id} = ${tournamentId}`,
		with: {
			rounds: {
				with: {
					userRoundPicks: true,
					matches: true,
				},
			},
		},
	});

	if (!tournament) {
		console.log(`❌ Tournament with ID ${tournamentId} not found!\n`);
		process.exit(1);
	}

	const totalPicks = tournament.rounds.reduce(
		(sum, round) => sum + round.userRoundPicks.length,
		0,
	);
	const totalMatches = tournament.rounds.reduce(
		(sum, round) => sum + round.matches.length,
		0,
	);

	console.log(`  ❌ DELETING: ${tournament.name} (ID: ${tournament.id})`);
	console.log(`    - ${tournament.rounds.length} rounds`);
	console.log(`    - ${totalMatches} matches`);
	console.log(`    - ${totalPicks} user picks`);

	const roundIds = tournament.rounds.map((r) => r.id);
	const matchIds = tournament.rounds.flatMap((r) => r.matches.map((m) => m.id));

	// Delete in order respecting foreign key constraints:
	// 1. Delete match picks (references matches)
	if (matchIds.length > 0) {
		console.log("    Deleting match picks...");
		await db
			.delete(matchPicks)
			.where(sql`${matchPicks.matchId} IN ${sql.raw(`(${matchIds.join(",")})`)}`);
	}

	// 2. Delete user streaks (references matches via lastMatchId)
	if (matchIds.length > 0) {
		console.log("    Deleting user streaks...");
		await db
			.delete(userStreaks)
			.where(sql`${userStreaks.lastMatchId} IN ${sql.raw(`(${matchIds.join(",")})`)}`);
	}

	// 3. Delete matches (references rounds)
	if (roundIds.length > 0) {
		console.log("    Deleting matches...");
		await db
			.delete(matches)
			.where(sql`${matches.roundId} IN ${sql.raw(`(${roundIds.join(",")})`)}`);
	}

	// 4. Delete user round picks (references rounds)
	if (roundIds.length > 0) {
		console.log("    Deleting user round picks...");
		await db
			.delete(userRoundPicks)
			.where(sql`${userRoundPicks.roundId} IN ${sql.raw(`(${roundIds.join(",")})`)}`);
	}

	// 5. Delete round scoring rules (references rounds)
	if (roundIds.length > 0) {
		console.log("    Deleting round scoring rules...");
		await db
			.delete(roundScoringRules)
			.where(
				sql`${roundScoringRules.roundId} IN ${sql.raw(`(${roundIds.join(",")})`)}`,
			);
	}

	// 6. Delete user achievements (references rounds)
	if (roundIds.length > 0) {
		console.log("    Deleting user achievements...");
		await db
			.delete(userAchievements)
			.where(
				sql`${userAchievements.roundId} IN ${sql.raw(`(${roundIds.join(",")})`)}`,
			);
	}

	// 7. Delete rounds (references tournaments)
	if (roundIds.length > 0) {
		console.log("    Deleting rounds...");
		await db
			.delete(rounds)
			.where(sql`${rounds.id} IN ${sql.raw(`(${roundIds.join(",")})`)}`);
	}

	// 8. Delete tournament
	console.log("    Deleting tournament...");
	await db.delete(tournaments).where(sql`${tournaments.id} = ${tournament.id}`);

	console.log(`    ✅ Permanently deleted\n`);
	console.log(`\n✅ Tournament "${tournament.name}" has been permanently deleted!`);
	console.log("⚠️  This action cannot be undone.\n");
}

async function main() {
	const command = process.argv[2];

	console.log("\n🧹 Test Tournament Cleanup Script\n");
	console.log(`${"=".repeat(50)}\n`);

	try {
		switch (command) {
			case "list":
				await listTestTournaments();
				break;

			case "soft-delete":
				await softDeleteTestTournaments();
				break;

			case "hard-delete":
				console.log(
					"⚠️  WARNING: This will PERMANENTLY delete test tournaments!",
				);
				console.log("⚠️  This action CANNOT be undone!\n");
				console.log("To confirm, please run:");
				console.log(
					"  pnpm tsx scripts/cleanup-test-tournaments.ts hard-delete-confirm\n",
				);
				break;

			case "hard-delete-confirm":
				await hardDeleteTestTournaments();
				break;

			case "delete-by-id": {
				const id = Number.parseInt(process.argv[3] || "", 10);
				if (Number.isNaN(id)) {
					console.log("❌ Error: Invalid tournament ID\n");
					console.log("Usage:");
					console.log(
						"  pnpm tsx scripts/cleanup-test-tournaments.ts delete-by-id <tournament-id>\n",
					);
					process.exit(1);
				}
				await deleteById(id);
				break;
			}

			case "delete-by-id-confirm": {
				const id = Number.parseInt(process.argv[3] || "", 10);
				if (Number.isNaN(id)) {
					console.log("❌ Error: Invalid tournament ID\n");
					console.log("Usage:");
					console.log(
						"  pnpm tsx scripts/cleanup-test-tournaments.ts delete-by-id-confirm <tournament-id>\n",
					);
					process.exit(1);
				}
				await deleteByIdConfirm(id);
				break;
			}

			default:
				console.log("Usage:");
				console.log("  pnpm tsx scripts/cleanup-test-tournaments.ts list");
				console.log(
					"  pnpm tsx scripts/cleanup-test-tournaments.ts soft-delete",
				);
				console.log(
					"  pnpm tsx scripts/cleanup-test-tournaments.ts hard-delete",
				);
				console.log(
					"  pnpm tsx scripts/cleanup-test-tournaments.ts delete-by-id <id>",
				);
				console.log("\nTest patterns (case-insensitive):");
				console.log("  - Contains: test, demo, sample");
				console.log("  - Starts with: zzz, temp");
				console.log("\nDelete by ID:");
				console.log(
					"  Use delete-by-id <id> to permanently delete a specific tournament",
				);
				process.exit(1);
		}

		process.exit(0);
	} catch (error) {
		console.error("\n❌ Error:", error);
		process.exit(1);
	}
}

main();
