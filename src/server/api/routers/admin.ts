import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import {
	matches,
	roundScoringRules,
	rounds,
	tournamentFormatEnum,
	tournaments,
	userRoundPicks,
	users,
} from "~/server/db/schema";
import { parseAtpDraw, validateParsedDraw } from "~/server/services/drawParser";
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
									// Optional result fields from parser
									winnerName: z.string().optional(),
									setsWon: z.number().int().min(0).max(3).optional(),
									setsLost: z.number().int().min(0).max(3).optional(),
									finalScore: z.string().optional(),
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

				// PHASE 1 OPTIMIZATION: Batch insert all rounds at once (1 query instead of N)
				const insertedRounds = await tx
					.insert(rounds)
					.values(
						parsedDraw.rounds.map((roundData) => ({
							tournamentId: tournament.id,
							roundNumber: roundData.roundNumber,
							name: roundData.name,
							isActive: false,
							isFinalized: false,
						})),
					)
					.returning();

				if (insertedRounds.length !== parsedDraw.rounds.length) {
					throw new Error("Failed to create all rounds");
				}

				// Create mapping from round number to round ID for later use
				const roundNumberToId = new Map(
					insertedRounds.map((r) => [r.roundNumber, r.id]),
				);

				// PHASE 1 OPTIMIZATION: Batch insert all scoring rules at once (1 query instead of N)
				await tx.insert(roundScoringRules).values(
					insertedRounds.map((round) => {
						const roundData = parsedDraw.rounds.find(
							(r) => r.roundNumber === round.roundNumber,
						);
						if (!roundData) {
							throw new Error(`Round data not found for ${round.roundNumber}`);
						}
						const scoring = getScoringForRound(roundData.name);
						return {
							roundId: round.id,
							pointsPerWinner: scoring.pointsPerWinner,
							pointsExactScore: scoring.pointsExactScore,
						};
					}),
				);

				// PHASE 2 OPTIMIZATION: Batch insert ALL matches at once (1 query instead of N)
				// Flatten all matches from all rounds into a single array
				const allMatchValues = parsedDraw.rounds.flatMap((roundData) => {
					const roundId = roundNumberToId.get(roundData.roundNumber);
					if (!roundId) {
						throw new Error(`Round ID not found for ${roundData.roundNumber}`);
					}

					return roundData.matches.map((match) => {
						// Normalize player names - use "TBD" for empty/missing names
						const player1Name = match.player1Name?.trim() || "TBD";
						const player2Name = match.player2Name?.trim() || "TBD";

						// Detect BYE matches (case-insensitive, only if name is provided)
						const player1IsBye = player1Name.toUpperCase() === "BYE";
						const player2IsBye = player2Name.toUpperCase() === "BYE";
						const isBye = player1IsBye || player2IsBye;

						if (isBye) {
							// Validate that exactly one player is BYE (not both)
							if (player1IsBye && player2IsBye) {
								throw new Error(
									`Invalid BYE match in round ${roundData.roundNumber}, match ${match.matchNumber}: both players cannot be BYE`,
								);
							}

							// BYE match: auto-finalize with non-BYE player as winner
							const winnerName = player1IsBye ? player2Name : player1Name;

							return {
								roundId,
								matchNumber: match.matchNumber,
								player1Name,
								player2Name,
								player1Seed: match.player1Seed,
								player2Seed: match.player2Seed,
								winnerName,
								status: "finalized" as const,
								isBye: true,
								finalizedAt: new Date(),
								finalizedBy: ctx.user.id,
							};
						}

						// Check if match has result from parser
						const hasResult =
							match.winnerName &&
							match.setsWon != null &&
							match.setsLost != null &&
							match.finalScore;

						if (hasResult) {
							// Match is completed - mark as finalized with results
							return {
								roundId,
								matchNumber: match.matchNumber,
								player1Name,
								player2Name,
								player1Seed: match.player1Seed,
								player2Seed: match.player2Seed,
								winnerName: match.winnerName,
								finalScore: match.finalScore,
								setsWon: match.setsWon,
								setsLost: match.setsLost,
								status: "finalized" as const,
								isBye: false,
								isRetirement: false, // We can't detect retirement from HTML currently
								finalizedAt: new Date(),
								finalizedBy: ctx.user.id, // Imported from parser
							};
						}

						// Normal pending match (with real names or TBD placeholders)
						return {
							roundId,
							matchNumber: match.matchNumber,
							player1Name,
							player2Name,
							player1Seed: player1Name === "TBD" ? null : match.player1Seed,
							player2Seed: player2Name === "TBD" ? null : match.player2Seed,
							status: "pending" as const,
							isBye: false,
						};
					});
				});

				// Insert all matches in a single batch operation
				if (allMatchValues.length > 0) {
					await tx.insert(matches).values(allMatchValues);
				}

				// PHASE 3 OPTIMIZATION: Bulk winner propagation
				// After all rounds and matches are created, propagate winners from finalized matches
				// This handles both BYE matches and completed matches from the parser
				const allRounds = await tx.query.rounds.findMany({
					where: eq(rounds.tournamentId, tournament.id),
					with: { matches: true },
					orderBy: [asc(rounds.roundNumber)],
				});

				// Collect all winner propagation updates grouped by target round
				type WinnerUpdate = {
					targetRoundNumber: number;
					targetMatchNumber: number;
					playerSlot: "player1" | "player2";
					winnerName: string;
					winnerSeed: number | null;
				};

				const winnerUpdates: WinnerUpdate[] = [];

				// Process each round to find finalized matches and collect updates
				for (const currentRound of allRounds) {
					const finalizedMatches = currentRound.matches.filter(
						(m) => m.status === "finalized" && m.winnerName,
					);

					if (finalizedMatches.length === 0) continue;

					// Find next round
					const nextRound = allRounds.find(
						(r) => r.roundNumber === currentRound.roundNumber + 1,
					);

					if (!nextRound) continue; // Final round, no next round to propagate to

					// Collect updates for each finalized match
					for (const finalizedMatch of finalizedMatches) {
						// Skip if no winner name (defensive check)
						if (!finalizedMatch.winnerName) continue;

						// Calculate which match in next round this winner goes to
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
							targetRoundNumber: nextRound.roundNumber,
							targetMatchNumber: nextMatchNumber,
							playerSlot,
							winnerName: finalizedMatch.winnerName,
							winnerSeed,
						});
					}
				}

				// Group updates by target round for bulk updates
				const updatesByRound = new Map<number, WinnerUpdate[]>();
				for (const update of winnerUpdates) {
					const roundUpdates = updatesByRound.get(update.targetRoundNumber);
					if (roundUpdates) {
						roundUpdates.push(update);
					} else {
						updatesByRound.set(update.targetRoundNumber, [update]);
					}
				}

				// Execute bulk updates for each round using SQL CASE statements
				for (const [roundNumber, updates] of updatesByRound) {
					const targetRound = allRounds.find(
						(r) => r.roundNumber === roundNumber,
					);
					if (!targetRound) continue;

					// Separate updates by player slot
					const player1Updates = updates.filter(
						(u) => u.playerSlot === "player1",
					);
					const player2Updates = updates.filter(
						(u) => u.playerSlot === "player2",
					);

					// Build CASE statements for player1 updates
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

					// Build CASE statements for player2 updates
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

					// Execute single update query for this round
					if (updates.length > 0) {
						// Build update object dynamically to only include fields with updates
						const updateFields: Record<string, unknown> = {};

						if (player1Updates.length > 0) {
							updateFields.player1Name = sql`CASE ${player1NameCases} ELSE ${matches.player1Name} END`;
							updateFields.player1Seed = sql`CASE ${player1SeedCases} ELSE ${matches.player1Seed} END`;
						}

						if (player2Updates.length > 0) {
							updateFields.player2Name = sql`CASE ${player2NameCases} ELSE ${matches.player2Name} END`;
							updateFields.player2Seed = sql`CASE ${player2SeedCases} ELSE ${matches.player2Seed} END`;
						}

						if (Object.keys(updateFields).length > 0) {
							await tx
								.update(matches)
								.set(updateFields)
								.where(eq(matches.roundId, targetRound.id));
						}
					}
				}

				// Auto-finalize rounds where all matches are completed
				// This handles cases where the parser imports fully completed rounds
				const roundsToFinalize = allRounds.filter((round) => {
					const roundMatches = round.matches.filter((m) => !m.deletedAt);
					const allMatchesFinalized = roundMatches.every(
						(m) => m.status === "finalized",
					);
					return (
						allMatchesFinalized && roundMatches.length > 0 && !round.isFinalized
					);
				});

				// Batch update all rounds to finalize in one query
				if (roundsToFinalize.length > 0) {
					const roundIdsToFinalize = roundsToFinalize.map((r) => r.id);
					await tx
						.update(rounds)
						.set({ isFinalized: true })
						.where(
							sql`${rounds.id} IN (${sql.join(
								roundIdsToFinalize.map((id) => sql`${id}`),
								sql`, `,
							)})`,
						);
				}

				// PHASE 4 OPTIMIZATION: Skip score calculation for new tournaments
				// Check if there are any picks for this tournament before calculating scores
				const existingPicks = await tx.query.userRoundPicks.findMany({
					where: sql`${userRoundPicks.roundId} IN (${sql.join(
						allRounds.map((r) => sql`${r.id}`),
						sql`, `,
					)})`,
					limit: 1, // We only need to know if ANY picks exist
				});

				// Only calculate scores if there are picks to score
				if (existingPicks.length > 0) {
					// After winner propagation, calculate scores for all finalized matches
					// Only calculate for non-BYE matches that have actual scores
					const allFinalizedMatches = allRounds.flatMap((round) =>
						round.matches.filter((m) => m.status === "finalized" && !m.isBye),
					);

					for (const match of allFinalizedMatches) {
						// Only calculate scores if match has actual scores (not BYE)
						if (match.setsWon != null && match.setsLost != null) {
							await calculateMatchPickScores(tx, match.id);
						}
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

			// Prevent manual finalization of BYE matches
			if (match.isBye) {
				throw new Error(
					"BYE matches are automatically finalized during tournament creation and cannot be manually updated",
				);
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

					// Determine the winner's seed
					const winnerSeed =
						input.winnerName === match.player1Name
							? match.player1Seed
							: match.player2Seed;

					// Build update object, only including seed if it's not null
					const updateData = isPlayer1
						? {
								player1Name: input.winnerName,
								...(winnerSeed !== null && { player1Seed: winnerSeed }),
							}
						: {
								player2Name: input.winnerName,
								...(winnerSeed !== null && { player2Seed: winnerSeed }),
							};

					await ctx.db
						.update(matches)
						.set(updateData)
						.where(eq(matches.id, nextMatch.id));
				}
			}

			// After winner propagation, check if all matches in the round are finalized
			// If so, automatically mark the round as finalized
			const roundMatches = await ctx.db.query.matches.findMany({
				where: and(
					eq(matches.roundId, match.roundId),
					isNull(matches.deletedAt),
				),
			});

			const allMatchesFinalized = roundMatches.every(
				(m) => m.status === "finalized",
			);

			if (allMatchesFinalized && !match.round.isFinalized) {
				await ctx.db
					.update(rounds)
					.set({ isFinalized: true })
					.where(eq(rounds.id, match.roundId));
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
	 * Soft delete a tournament
	 * This will also soft delete all associated matches
	 */
	deleteTournament: adminProcedure
		.input(
			z.object({
				id: z.number().int(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Get tournament with rounds and matches to check for user picks
			const tournament = await ctx.db.query.tournaments.findFirst({
				where: and(eq(tournaments.id, input.id), isNull(tournaments.deletedAt)),
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
				throw new Error("Tournament not found");
			}

			// Count total picks to return for user feedback
			const totalPicks = tournament.rounds.reduce(
				(sum, round) => sum + round.userRoundPicks.length,
				0,
			);

			// Soft delete the tournament
			await ctx.db
				.update(tournaments)
				.set({ deletedAt: new Date() })
				.where(eq(tournaments.id, input.id));

			// Soft delete all associated matches
			const roundIds = tournament.rounds.map((r) => r.id);
			if (roundIds.length > 0) {
				await ctx.db
					.update(matches)
					.set({ deletedAt: new Date() })
					.where(
						sql`${matches.roundId} IN ${sql.raw(`(${roundIds.join(",")})`)}`,
					);
			}

			return {
				success: true,
				tournamentName: tournament.name,
				picksDeleted: totalPicks,
			};
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
});

/**
 * Get the next round name based on the current round name
 * Returns null if the tournament is over (current round is Final)
 */
function _getNextRoundName(currentRoundName: string): string | null {
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
