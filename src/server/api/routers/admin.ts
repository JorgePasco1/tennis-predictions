import { z } from "zod";
import { eq, and, isNull, sql } from "drizzle-orm";

import { createTRPCRouter, adminProcedure } from "~/server/api/trpc";
import {
	tournaments,
	rounds,
	matches,
	userRoundPicks,
	roundScoringRules,
} from "~/server/db/schema";
import {
	parseAtpDraw,
	validateParsedDraw,
	type ParsedDraw,
} from "~/server/services/drawParser";
import { calculateMatchPickScores } from "~/server/services/scoring";

export const adminRouter = createTRPCRouter({
	/**
	 * Parse and preview ATP draw from HTML content
	 */
	uploadDraw: adminProcedure
		.input(
			z.object({
				htmlContent: z.string(),
				year: z.number().int().min(2000).max(2100),
			}),
		)
		.mutation(async ({ input }) => {
			// Parse the draw
			const parsedDraw = parseAtpDraw(input.htmlContent);

			// Validate the parsed draw
			const validation = validateParsedDraw(parsedDraw);

			if (!validation.valid) {
				throw new Error(
					`Failed to parse draw: ${validation.errors.join(", ")}`,
				);
			}

			return {
				...parsedDraw,
				year: input.year,
			};
		}),

	/**
	 * Commit parsed draw to database
	 */
	commitDraw: adminProcedure
		.input(
			z.object({
				parsedDraw: z.object({
					tournamentName: z.string(),
					year: z.number().int(),
					rounds: z.array(
						z.object({
							roundNumber: z.number().int(),
							name: z.string(),
							matches: z.array(
								z.object({
									matchNumber: z.number().int(),
									player1Name: z.string(),
									player2Name: z.string(),
									player1Seed: z.number().int().nullable(),
									player2Seed: z.number().int().nullable(),
								}),
							),
						}),
					),
				}),
				overwriteExisting: z.boolean().default(false),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { parsedDraw, overwriteExisting } = input;

			// Generate slug from tournament name
			const slug = generateSlug(parsedDraw.tournamentName, parsedDraw.year);

			// Check if tournament with this slug already exists
			const existingTournament = await ctx.db.query.tournaments.findFirst({
				where: and(eq(tournaments.slug, slug), isNull(tournaments.deletedAt)),
				with: {
					rounds: {
						with: {
							userRoundPicks: true,
							matches: true,
						},
					},
				},
			});

			// If tournament exists, check for conflicts
			if (existingTournament) {
				// Count total picks across all rounds
				const totalPicks = existingTournament.rounds.reduce(
					(sum, round) => sum + round.userRoundPicks.length,
					0,
				);

				// Check if any round has finalized matches
				const hasFinalized = existingTournament.rounds.some((round) =>
					round.matches.some((match) => match.status === "finalized"),
				);

				if (hasFinalized) {
					throw new Error(
						"Cannot re-upload: Tournament has finalized matches. This operation is blocked to preserve data integrity.",
					);
				}

				if (totalPicks > 0 && !overwriteExisting) {
					throw new Error(
						`Tournament already exists with ${totalPicks} user picks. Set overwriteExisting=true to proceed with soft delete.`,
					);
				}

				// Soft delete existing tournament and all related data
				await ctx.db
					.update(tournaments)
					.set({ deletedAt: new Date() })
					.where(eq(tournaments.id, existingTournament.id));

				// Soft delete all associated matches
				const roundIds = existingTournament.rounds.map((r) => r.id);
				if (roundIds.length > 0) {
					await ctx.db
						.update(matches)
						.set({ deletedAt: new Date() })
						.where(
							sql`${matches.roundId} IN ${sql.raw(`(${roundIds.join(",")})`)}`,
						);
				}
			}

			// Create tournament and all related data in a transaction
			return await ctx.db.transaction(async (tx) => {
				// Insert tournament
				const [tournament] = await tx
					.insert(tournaments)
					.values({
						name: parsedDraw.tournamentName,
						slug,
						year: parsedDraw.year,
						status: "draft",
						uploadedBy: ctx.user.id,
					})
					.returning();

				if (!tournament) {
					throw new Error("Failed to create tournament");
				}

				// Insert rounds and matches
				for (const roundData of parsedDraw.rounds) {
					const [round] = await tx
						.insert(rounds)
						.values({
							tournamentId: tournament.id,
							roundNumber: roundData.roundNumber,
							name: roundData.name,
							isActive: false,
							isFinalized: false,
						})
						.returning();

					if (!round) {
						throw new Error(`Failed to create round ${roundData.roundNumber}`);
					}

					// Create default scoring rule for this round
					await tx.insert(roundScoringRules).values({
						roundId: round.id,
						pointsPerWinner: 10,
						pointsExactScore: 5,
					});

					// Insert matches for this round
					const matchValues = roundData.matches.map((match) => ({
						roundId: round.id,
						matchNumber: match.matchNumber,
						player1Name: match.player1Name,
						player2Name: match.player2Name,
						player1Seed: match.player1Seed,
						player2Seed: match.player2Seed,
						status: "pending" as const,
					}));

					if (matchValues.length > 0) {
						await tx.insert(matches).values(matchValues);
					}
				}

				return tournament;
			});
		}),

	/**
	 * Set the active round for a tournament
	 */
	setActiveRound: adminProcedure
		.input(
			z.object({
				tournamentId: z.number().int(),
				roundNumber: z.number().int(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const tournament = await ctx.db.query.tournaments.findFirst({
				where: and(
					eq(tournaments.id, input.tournamentId),
					isNull(tournaments.deletedAt),
				),
				with: {
					rounds: true,
				},
			});

			if (!tournament) {
				throw new Error("Tournament not found");
			}

			// Verify the round exists
			const targetRound = tournament.rounds.find(
				(r) => r.roundNumber === input.roundNumber,
			);
			if (!targetRound) {
				throw new Error(
					`Round ${input.roundNumber} not found in this tournament`,
				);
			}

			// Update tournament's current round
			await ctx.db
				.update(tournaments)
				.set({ currentRoundNumber: input.roundNumber })
				.where(eq(tournaments.id, input.tournamentId));

			// Deactivate all rounds
			await ctx.db
				.update(rounds)
				.set({ isActive: false })
				.where(eq(rounds.tournamentId, input.tournamentId));

			// Activate the selected round
			await ctx.db
				.update(rounds)
				.set({ isActive: true })
				.where(eq(rounds.id, targetRound.id));

			return { success: true };
		}),

	/**
	 * Finalize a match result
	 */
	finalizeMatch: adminProcedure
		.input(
			z.object({
				matchId: z.number().int(),
				winnerName: z.string(),
				finalScore: z.string(),
				setsWon: z.number().int().min(2).max(3),
				setsLost: z.number().int().min(0).max(2),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Get the match
			const match = await ctx.db.query.matches.findFirst({
				where: and(eq(matches.id, input.matchId), isNull(matches.deletedAt)),
			});

			if (!match) {
				throw new Error("Match not found");
			}

			// Verify winner is one of the players
			if (
				input.winnerName !== match.player1Name &&
				input.winnerName !== match.player2Name
			) {
				throw new Error(
					"Winner must be one of the match players",
				);
			}

			// Validate sets
			if (input.setsWon < 2) {
				throw new Error("Winner must have won at least 2 sets");
			}
			if (input.setsLost >= input.setsWon) {
				throw new Error("Winner must have won more sets than they lost");
			}
			if (input.setsWon === 2 && input.setsLost > 1) {
				throw new Error(
					"Invalid score: if sets won is 2, sets lost must be 0 or 1",
				);
			}
			if (input.setsWon === 3 && input.setsLost !== 2) {
				throw new Error("Invalid score: if sets won is 3, sets lost must be 2");
			}

			// Update match with result
			const [updatedMatch] = await ctx.db
				.update(matches)
				.set({
					winnerName: input.winnerName,
					finalScore: input.finalScore,
					setsWon: input.setsWon,
					setsLost: input.setsLost,
					status: "finalized",
					finalizedAt: new Date(),
					finalizedBy: ctx.user.id,
				})
				.where(eq(matches.id, input.matchId))
				.returning();

			// Calculate scores for all picks on this match
			await calculateMatchPickScores(ctx.db, input.matchId);

			return updatedMatch;
		}),
});

/**
 * Generate a URL-friendly slug from tournament name and year
 */
function generateSlug(name: string, year: number): string {
	return `${name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")}-${year}`;
}
