import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import {
	matches,
	matchPicks,
	roundScoringRules,
	rounds,
	tournamentFormatEnum,
	tournaments,
	userRoundPicks,
	users,
} from "~/server/db/schema";
import {
	type ParsedDraw,
	parseAtpDraw,
	validateParsedDraw,
} from "~/server/services/drawParser";
import {
	calculateMatchPickScores,
	unfinalizeMatchScores,
} from "~/server/services/scoring";
import { getScoringForRound } from "~/server/utils/scoring-config";

export const adminRouter = createTRPCRouter({
	/**
	 * Parse and preview ATP draw from HTML content
	 * The htmlContent should be base64-encoded to safely transmit large files
	 */
	uploadDraw: adminProcedure
		.input(
			z.object({
				htmlContentBase64: z.string(),
				year: z.number().int().min(2000).max(2100),
			}),
		)
		.mutation(async ({ input }) => {
			// Decode base64 to get the HTML/MHTML content
			let htmlContent: string;
			try {
				htmlContent = Buffer.from(input.htmlContentBase64, "base64").toString(
					"utf-8",
				);
			} catch (decodeError) {
				throw new Error(
					`Failed to decode base64 content: ${decodeError instanceof Error ? decodeError.message : String(decodeError)}`,
				);
			}

			// Parse the draw
			const parsedDraw = parseAtpDraw(htmlContent);

			// Validate the parsed draw
			const validation = validateParsedDraw(parsedDraw);

			if (!validation.valid) {
				throw new Error(
					`Failed to parse draw: ${validation.errors.join(", ")}`,
				);
			}

			const result = {
				...parsedDraw,
				year: input.year,
			};

			// Validate JSON serialization before returning
			try {
				const jsonString = JSON.stringify(result);
				const sizeInMB = (jsonString.length / (1024 * 1024)).toFixed(2);
				console.log(
					`✅ Upload parsed successfully. Response size: ${sizeInMB}MB`,
				);
			} catch (jsonError) {
				throw new Error(
					`Parsed draw contains invalid characters that cannot be serialized: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`,
				);
			}

			return result;
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
				format: z.enum(tournamentFormatEnum.enumValues).default("bo3"),
				atpUrl: z.string().url().optional(),
				overwriteExisting: z.boolean().default(false),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { parsedDraw, format, atpUrl, overwriteExisting } = input;

			// Ensure the current user exists in the database (upsert)
			// This handles cases where the Clerk webhook hasn't synced the user yet
			await ctx.db
				.insert(users)
				.values({
					id: ctx.user.id,
					clerkId: ctx.user.id,
					email: ctx.user.email,
					displayName: ctx.user.email.split("@")[0] ?? "Admin",
					role: "admin",
				})
				.onConflictDoNothing({ target: users.id });

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
						format,
						atpUrl,
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

					// Create scoring rule for this round using progressive scoring
					const scoring = getScoringForRound(roundData.name);
					await tx.insert(roundScoringRules).values({
						roundId: round.id,
						pointsPerWinner: scoring.pointsPerWinner,
						pointsExactScore: scoring.pointsExactScore,
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
	 * Close submissions for a round
	 * This prevents new picks and automatically finalizes all existing drafts
	 */
	closeRoundSubmissions: adminProcedure
		.input(
			z.object({
				roundId: z.number().int(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Get the round with its tournament
			const round = await ctx.db.query.rounds.findFirst({
				where: eq(rounds.id, input.roundId),
				with: {
					tournament: true,
				},
			});

			if (!round) {
				throw new Error("Round not found");
			}

			// Validate round is active
			if (!round.isActive) {
				throw new Error("Can only close submissions for active rounds");
			}

			// Check if already closed
			if (round.submissionsClosedAt) {
				throw new Error("Submissions have already been closed for this round");
			}

			// Close submissions and finalize drafts in a transaction
			const result = await ctx.db.transaction(async (tx) => {
				const now = new Date();

				// Close submissions
				await tx
					.update(rounds)
					.set({
						submissionsClosedAt: now,
						submissionsClosedBy: ctx.user.id,
					})
					.where(eq(rounds.id, input.roundId));

				// Find all draft picks for this round
				const draftPicks = await tx.query.userRoundPicks.findMany({
					where: and(
						eq(userRoundPicks.roundId, input.roundId),
						eq(userRoundPicks.isDraft, true),
					),
				});

				// Convert all drafts to final submissions
				if (draftPicks.length > 0) {
					await tx
						.update(userRoundPicks)
						.set({
							isDraft: false,
							submittedAt: now,
						})
						.where(
							and(
								eq(userRoundPicks.roundId, input.roundId),
								eq(userRoundPicks.isDraft, true),
							),
						);
				}

				return { draftsFinalized: draftPicks.length };
			});

			return {
				success: true,
				draftsFinalized: result.draftsFinalized,
			};
		}),

	/**
	 * Finalize a match result and propagate winner to next round if it exists
	 */
	finalizeMatch: adminProcedure
		.input(
			z.object({
				matchId: z.number().int(),
				winnerName: z.string(),
				finalScore: z.string(),
				setsWon: z.number().int().min(0).max(3),
				setsLost: z.number().int().min(0).max(3),
				isRetirement: z.boolean().default(false),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Get the match with its round and tournament info
			const match = await ctx.db.query.matches.findFirst({
				where: and(eq(matches.id, input.matchId), isNull(matches.deletedAt)),
				with: {
					round: {
						with: {
							tournament: {
								with: {
									rounds: {
										with: {
											matches: true,
										},
									},
								},
							},
						},
					},
				},
			});

			if (!match) {
				throw new Error("Match not found");
			}

			// Verify winner is one of the players
			if (
				input.winnerName !== match.player1Name &&
				input.winnerName !== match.player2Name
			) {
				throw new Error("Winner must be one of the match players");
			}

			// Only apply strict set validation for non-retirement matches
			if (!input.isRetirement) {
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
				if (input.setsWon === 3 && input.setsLost > 2) {
					throw new Error(
						"Invalid score: if sets won is 3, sets lost must be 0, 1, or 2",
					);
				}
			}

			// Build final score - append RET for retirement matches
			const finalScore = input.isRetirement
				? `${input.finalScore} RET`
				: input.finalScore;

			// Update match with result
			const [updatedMatch] = await ctx.db
				.update(matches)
				.set({
					winnerName: input.winnerName,
					finalScore,
					setsWon: input.setsWon,
					setsLost: input.setsLost,
					status: "finalized",
					finalizedAt: new Date(),
					finalizedBy: ctx.user.id,
					isRetirement: input.isRetirement,
				})
				.where(eq(matches.id, input.matchId))
				.returning();

			// Calculate scores for all picks on this match
			await calculateMatchPickScores(ctx.db, input.matchId);

			// Propagate winner to next round if it exists
			const nextRound = match.round.tournament.rounds.find(
				(r) => r.roundNumber === match.round.roundNumber + 1,
			);

			if (nextRound) {
				// Calculate which match in next round this winner goes to
				// Match 1 & 2 → Next Match 1, Match 3 & 4 → Next Match 2, etc.
				const nextMatchNumber = Math.ceil(match.matchNumber / 2);

				// Find the next match
				const nextMatch = nextRound.matches.find(
					(m) => m.matchNumber === nextMatchNumber && !m.deletedAt,
				);

				if (nextMatch) {
					// Odd match numbers → player1, Even match numbers → player2
					const isPlayer1 = match.matchNumber % 2 === 1;

					await ctx.db
						.update(matches)
						.set(
							isPlayer1
								? { player1Name: input.winnerName }
								: { player2Name: input.winnerName },
						)
						.where(eq(matches.id, nextMatch.id));
				}
			}

			return updatedMatch;
		}),

	/**
	 * Unfinalize a match and roll back all scoring
	 */
	unfinalizeMatch: adminProcedure
		.input(
			z.object({
				matchId: z.number().int(),
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

			if (match.status !== "finalized") {
				throw new Error("Match is not finalized and cannot be unfinalized");
			}

			// Use transaction to ensure atomic rollback
			return await ctx.db.transaction(async (tx) => {
				// Reset the match to pending status
				const [resetMatch] = await tx
					.update(matches)
					.set({
						winnerName: null,
						finalScore: null,
						setsWon: null,
						setsLost: null,
						status: "pending",
						finalizedAt: null,
						finalizedBy: null,
						isRetirement: false,
					})
					.where(eq(matches.id, input.matchId))
					.returning();

				// Reset all scores for this match
				await unfinalizeMatchScores(tx, input.matchId);

				return resetMatch;
			});
		}),

	/**
	 * Update tournament properties
	 */
	updateTournament: adminProcedure
		.input(
			z.object({
				id: z.number().int(),
				format: z.enum(tournamentFormatEnum.enumValues).optional(),
				atpUrl: z.string().url().optional().or(z.literal("")),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const tournament = await ctx.db.query.tournaments.findFirst({
				where: and(eq(tournaments.id, input.id), isNull(tournaments.deletedAt)),
			});

			if (!tournament) {
				throw new Error("Tournament not found");
			}

			const updateData: {
				format?: "bo3" | "bo5";
				atpUrl?: string | null;
			} = {};

			if (input.format) {
				updateData.format = input.format;
			}

			if (input.atpUrl !== undefined) {
				updateData.atpUrl = input.atpUrl || null;
			}

			const [updatedTournament] = await ctx.db
				.update(tournaments)
				.set(updateData)
				.where(eq(tournaments.id, input.id))
				.returning();

			return updatedTournament;
		}),

	/**
	 * Update round dates (opens_at and deadline)
	 */
	updateRoundDates: adminProcedure
		.input(
			z.object({
				roundId: z.number().int(),
				opensAt: z.string().datetime().nullable().optional(),
				deadline: z.string().datetime().nullable().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const round = await ctx.db.query.rounds.findFirst({
				where: eq(rounds.id, input.roundId),
			});

			if (!round) {
				throw new Error("Round not found");
			}

			const updateData: {
				opensAt?: Date | null;
				deadline?: Date | null;
			} = {};

			if (input.opensAt !== undefined) {
				updateData.opensAt = input.opensAt ? new Date(input.opensAt) : null;
			}

			if (input.deadline !== undefined) {
				updateData.deadline = input.deadline ? new Date(input.deadline) : null;
			}

			const [updatedRound] = await ctx.db
				.update(rounds)
				.set(updateData)
				.where(eq(rounds.id, input.roundId))
				.returning();

			return updatedRound;
		}),

	/**
	 * Manually create a new round for a tournament
	 */
	createRound: adminProcedure
		.input(
			z.object({
				tournamentId: z.number().int(),
				name: z.string().min(1),
				matchCount: z.number().int().min(1).max(128),
				opensAt: z.string().datetime().nullable().optional(),
				deadline: z.string().datetime().nullable().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Get the tournament with its rounds
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

			// Calculate the next round number
			const maxRoundNumber = tournament.rounds.reduce(
				(max, r) => Math.max(max, r.roundNumber),
				0,
			);
			const roundNumber = maxRoundNumber + 1;

			// Create the round and its matches in a transaction
			return await ctx.db.transaction(async (tx) => {
				// Create the round
				const [newRound] = await tx
					.insert(rounds)
					.values({
						tournamentId: input.tournamentId,
						roundNumber,
						name: input.name,
						isActive: false,
						isFinalized: false,
						opensAt: input.opensAt ? new Date(input.opensAt) : null,
						deadline: input.deadline ? new Date(input.deadline) : null,
					})
					.returning();

				if (!newRound) {
					throw new Error("Failed to create round");
				}

				// Create scoring rules for the round
				const scoring = getScoringForRound(input.name);
				await tx.insert(roundScoringRules).values({
					roundId: newRound.id,
					pointsPerWinner: scoring.pointsPerWinner,
					pointsExactScore: scoring.pointsExactScore,
				});

				// Create matches for the round
				const matchValues = [];
				for (let i = 0; i < input.matchCount; i++) {
					matchValues.push({
						roundId: newRound.id,
						matchNumber: i + 1,
						player1Name: "TBD",
						player2Name: "TBD",
						status: "pending" as const,
					});
				}

				await tx.insert(matches).values(matchValues);

				return {
					...newRound,
					matchCount: input.matchCount,
				};
			});
		}),

	/**
	 * Close a round - finalize it, create next round if needed, and propagate winners
	 */
	closeRound: adminProcedure
		.input(
			z.object({
				roundId: z.number().int(),
				activateNextRound: z.boolean().default(false),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Get the round with its matches and tournament
			const round = await ctx.db.query.rounds.findFirst({
				where: eq(rounds.id, input.roundId),
				with: {
					tournament: {
						with: {
							rounds: {
								with: {
									matches: true,
								},
							},
						},
					},
					matches: true,
				},
			});

			if (!round) {
				throw new Error("Round not found");
			}

			// Check if round is already finalized
			if (round.isFinalized) {
				throw new Error("Round is already closed");
			}

			// Check if all matches are finalized
			const pendingMatches = round.matches.filter(
				(m) => m.status === "pending" && !m.deletedAt,
			);
			if (pendingMatches.length > 0) {
				throw new Error(
					`Cannot close round: ${pendingMatches.length} match(es) are not finalized`,
				);
			}

			// Get winners from current round sorted by match number
			const currentMatchWinners = round.matches
				.filter((m) => !m.deletedAt && m.winnerName)
				.sort((a, b) => a.matchNumber - b.matchNumber)
				.map((m) => m.winnerName as string);

			// Determine if this is the final round (no next round possible)
			const nextRoundName = getNextRoundName(round.name);
			const isFinalRound = nextRoundName === null;

			// Find existing next round (by round number)
			const existingNextRound = round.tournament.rounds.find(
				(r) => r.roundNumber === round.roundNumber + 1,
			);

			// Use transaction for atomic updates
			return await ctx.db.transaction(async (tx) => {
				// Mark round as finalized
				await tx
					.update(rounds)
					.set({ isFinalized: true })
					.where(eq(rounds.id, input.roundId));

				// If this is the final round, just return
				if (isFinalRound) {
					return {
						success: true,
						hasNextRound: false,
						nextRoundActivated: false,
						nextRoundCreated: false,
					};
				}

				let nextRoundId: number;
				let nextRoundCreated = false;

				// Create next round if it doesn't exist
				if (!existingNextRound) {
					// Calculate number of matches for next round (half of current)
					const nextRoundMatchCount = Math.floor(
						currentMatchWinners.length / 2,
					);

					if (nextRoundMatchCount === 0) {
						throw new Error(
							"Cannot create next round: not enough winners from current round",
						);
					}

					// Create the next round
					const [newRound] = await tx
						.insert(rounds)
						.values({
							tournamentId: round.tournament.id,
							roundNumber: round.roundNumber + 1,
							name: nextRoundName,
							isActive: false,
							isFinalized: false,
						})
						.returning();

					if (!newRound) {
						throw new Error("Failed to create next round");
					}

					nextRoundId = newRound.id;
					nextRoundCreated = true;

					// Create scoring rules for the new round
					const scoring = getScoringForRound(nextRoundName);
					await tx.insert(roundScoringRules).values({
						roundId: newRound.id,
						pointsPerWinner: scoring.pointsPerWinner,
						pointsExactScore: scoring.pointsExactScore,
					});

					// Create matches for the next round with player names from winners
					const matchValues = [];
					for (let i = 0; i < nextRoundMatchCount; i++) {
						const player1Index = i * 2;
						const player2Index = i * 2 + 1;

						matchValues.push({
							roundId: newRound.id,
							matchNumber: i + 1,
							player1Name: currentMatchWinners[player1Index] ?? "TBD",
							player2Name: currentMatchWinners[player2Index] ?? "TBD",
							status: "pending" as const,
						});
					}

					await tx.insert(matches).values(matchValues);
				} else {
					// Next round exists, just update player names
					nextRoundId = existingNextRound.id;

					const nextRoundMatches = existingNextRound.matches
						.filter((m) => !m.deletedAt)
						.sort((a, b) => a.matchNumber - b.matchNumber);

					// Match winners to next round:
					// Match 1 & 2 winners → Next Match 1
					// Match 3 & 4 winners → Next Match 2
					// etc.
					for (let i = 0; i < nextRoundMatches.length; i++) {
						const player1Index = i * 2;
						const player2Index = i * 2 + 1;

						const player1Name = currentMatchWinners[player1Index];
						const player2Name = currentMatchWinners[player2Index];

						const updateData: { player1Name?: string; player2Name?: string } =
							{};

						if (player1Name) {
							updateData.player1Name = player1Name;
						}
						if (player2Name) {
							updateData.player2Name = player2Name;
						}

						if (Object.keys(updateData).length > 0) {
							await tx
								.update(matches)
								.set(updateData)
								.where(eq(matches.id, nextRoundMatches[i]!.id));
						}
					}
				}

				// Optionally activate the next round
				if (input.activateNextRound) {
					// Deactivate all rounds first
					await tx
						.update(rounds)
						.set({ isActive: false })
						.where(eq(rounds.tournamentId, round.tournament.id));

					// Activate next round
					await tx
						.update(rounds)
						.set({ isActive: true })
						.where(eq(rounds.id, nextRoundId));

					// Update tournament's current round number
					await tx
						.update(tournaments)
						.set({ currentRoundNumber: round.roundNumber + 1 })
						.where(eq(tournaments.id, round.tournament.id));
				}

				return {
					success: true,
					hasNextRound: true,
					nextRoundActivated: input.activateNextRound,
					nextRoundCreated,
				};
			});
		}),
});

/**
 * Get the next round name based on the current round name
 * Returns null if the tournament is over (current round is Final)
 */
function getNextRoundName(currentRoundName: string): string | null {
	const roundProgression: Record<string, string> = {
		"Round of 128": "Round of 64",
		"Round of 64": "Round of 32",
		"Round of 32": "Round of 16",
		"Round of 16": "Quarter Finals",
		"Quarter Finals": "Semi Finals",
		"Semi Finals": "Final",
	};

	return roundProgression[currentRoundName] ?? null;
}

/**
 * Generate a URL-friendly slug from tournament name and year
 */
function generateSlug(name: string, year: number): string {
	return `${name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")}-${year}`;
}
