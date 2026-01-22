#!/usr/bin/env tsx
/**
 * Verify backfill results for tournament ID 2
 */

import "dotenv/config";
import { db } from "~/server/db";

async function verify() {
	console.log("🔍 Verifying Tournament 2 Backfill Results\n");
	console.log("=".repeat(50) + "\n");

	const tournament = await db.query.tournaments.findFirst({
		where: (tournaments, { eq }) => eq(tournaments.id, 2),
		with: {
			rounds: {
				orderBy: (rounds, { asc }) => [asc(rounds.roundNumber)],
				with: {
					scoringRule: true,
					matches: {
						orderBy: (matches, { asc }) => [asc(matches.matchNumber)],
					},
				},
			},
		},
	});

	if (!tournament) {
		console.log("❌ Tournament 2 not found!");
		return;
	}

	console.log(`Tournament: ${tournament.name} (ID: ${tournament.id})`);
	console.log(`Total Rounds: ${tournament.rounds.length}\n`);

	for (const round of tournament.rounds) {
		console.log(`Round ${round.roundNumber}: ${round.name}`);
		console.log(`  Matches: ${round.matches.length}`);
		console.log(`  Active: ${round.isActive}`);
		console.log(`  Finalized: ${round.isFinalized}`);

		if (round.scoringRule) {
			console.log(
				`  Scoring: ${round.scoringRule.pointsPerWinner} pts/winner, ${round.scoringRule.pointsExactScore} pts/exact`,
			);
		}

		// Show match details for R32
		if (round.roundNumber === 3) {
			console.log("\n  R32 Match Details:");
			for (const match of round.matches) {
				const status =
					match.player1Name !== "TBD" || match.player2Name !== "TBD"
						? "✓"
						: "○";
				console.log(
					`    ${status} Match ${match.matchNumber}: ${match.player1Name} vs ${match.player2Name}`,
				);
			}
		}

		console.log("");
	}

	// Summary
	const totalMatches = tournament.rounds.reduce(
		(sum, r) => sum + r.matches.length,
		0,
	);
	const r32 = tournament.rounds.find((r) => r.roundNumber === 3);
	const r32WithPlayers = r32
		? r32.matches.filter(
				(m) => m.player1Name !== "TBD" || m.player2Name !== "TBD",
			).length
		: 0;
	const r32WithTBD = r32
		? r32.matches.filter(
				(m) => m.player1Name === "TBD" && m.player2Name === "TBD",
			).length
		: 0;

	console.log("Summary:");
	console.log(`  ✅ Total matches created: ${totalMatches}`);
	console.log(`  ✅ R32 matches with players: ${r32WithPlayers}`);
	console.log(`  ✅ R32 matches with TBD: ${r32WithTBD}`);
	console.log("");
}

verify()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error("Error:", error);
		process.exit(1);
	});
