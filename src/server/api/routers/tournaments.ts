import { z } from "zod";
import { eq, isNull, and, desc } from "drizzle-orm";

import {
	createTRPCRouter,
	protectedProcedure,
	adminProcedure,
} from "~/server/api/trpc";
import {
	tournaments,
	rounds,
	matches,
	tournamentStatusEnum,
} from "~/server/db/schema";

export const tournamentsRouter = createTRPCRouter({
	/**
	 * List all tournaments, optionally filtered by status
	 */
	list: protectedProcedure
		.input(
			z
				.object({
					status: z.enum(tournamentStatusEnum.enumValues).optional(),
				})
				.optional(),
		)
		.query(async ({ ctx, input }) => {
			const filters = [isNull(tournaments.deletedAt)];

			if (input?.status) {
				filters.push(eq(tournaments.status, input.status));
			}

			return await ctx.db.query.tournaments.findMany({
				where: and(...filters),
				orderBy: [desc(tournaments.createdAt)],
				with: {
					uploadedByUser: {
						columns: {
							displayName: true,
							email: true,
						},
					},
				},
			});
		}),

	/**
	 * Get a single tournament by ID with all rounds and matches
	 */
	getById: protectedProcedure
		.input(
			z.object({
				id: z.number(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const tournament = await ctx.db.query.tournaments.findFirst({
				where: and(
					eq(tournaments.id, input.id),
					isNull(tournaments.deletedAt),
				),
				with: {
					uploadedByUser: {
						columns: {
							displayName: true,
							email: true,
						},
					},
					rounds: {
						orderBy: [rounds.roundNumber],
						with: {
							matches: {
								orderBy: [matches.matchNumber],
								where: isNull(matches.deletedAt),
							},
							scoringRule: true,
						},
					},
				},
			});

			if (!tournament) {
				throw new Error("Tournament not found");
			}

			return tournament;
		}),

	/**
	 * Get a tournament by slug (for public URLs)
	 */
	getBySlug: protectedProcedure
		.input(
			z.object({
				slug: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const tournament = await ctx.db.query.tournaments.findFirst({
				where: and(
					eq(tournaments.slug, input.slug),
					isNull(tournaments.deletedAt),
				),
				with: {
					uploadedByUser: {
						columns: {
							displayName: true,
							email: true,
						},
					},
					rounds: {
						orderBy: [rounds.roundNumber],
						with: {
							matches: {
								orderBy: [matches.matchNumber],
								where: isNull(matches.deletedAt),
							},
							scoringRule: true,
						},
					},
				},
			});

			if (!tournament) {
				throw new Error("Tournament not found");
			}

			return tournament;
		}),

	/**
	 * Update tournament status (admin only)
	 */
	updateStatus: adminProcedure
		.input(
			z.object({
				id: z.number(),
				status: z.enum(tournamentStatusEnum.enumValues),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const result = await ctx.db
				.update(tournaments)
				.set({
					status: input.status,
				})
				.where(
					and(eq(tournaments.id, input.id), isNull(tournaments.deletedAt)),
				)
				.returning();

			if (!result[0]) {
				throw new Error("Tournament not found");
			}

			return result[0];
		}),
});
