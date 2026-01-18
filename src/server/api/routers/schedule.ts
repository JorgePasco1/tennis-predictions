import { and, asc, eq, gte, isNull, or } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { rounds, tournaments, userStreaks } from "~/server/db/schema";

export const scheduleRouter = createTRPCRouter({
	/**
	 * Get all upcoming round deadlines across active tournaments
	 */
	getUpcomingDeadlines: protectedProcedure
		.input(
			z
				.object({
					limit: z.number().min(1).max(50).optional().default(10),
				})
				.optional(),
		)
		.query(async ({ ctx, input }) => {
			const now = new Date();
			const limit = input?.limit ?? 10;

			// Get all rounds with deadlines in the future from active tournaments
			const upcomingRounds = await ctx.db.query.rounds.findMany({
				where: and(
					or(
						// Has a future deadline
						gte(rounds.deadline, now),
						// Or has a future opensAt (not yet open)
						gte(rounds.opensAt, now),
						// Or is active and not yet closed
						and(eq(rounds.isActive, true), isNull(rounds.submissionsClosedAt)),
					),
				),
				orderBy: [asc(rounds.deadline), asc(rounds.opensAt)],
				limit,
				with: {
					tournament: {
						columns: {
							id: true,
							name: true,
							slug: true,
							status: true,
						},
					},
				},
			});

			// Filter to only include rounds from active tournaments
			const filteredRounds = upcomingRounds.filter(
				(round) => round.tournament.status === "active",
			);

			return filteredRounds.map((round) => ({
				id: round.id,
				name: round.name,
				roundNumber: round.roundNumber,
				isActive: round.isActive,
				opensAt: round.opensAt,
				deadline: round.deadline,
				submissionsClosedAt: round.submissionsClosedAt,
				tournament: {
					id: round.tournament.id,
					name: round.tournament.name,
					slug: round.tournament.slug,
				},
			}));
		}),

	/**
	 * Get schedule for a specific tournament
	 */
	getTournamentSchedule: protectedProcedure
		.input(
			z.object({
				tournamentId: z.number(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const tournament = await ctx.db.query.tournaments.findFirst({
				where: and(
					eq(tournaments.id, input.tournamentId),
					isNull(tournaments.deletedAt),
				),
				with: {
					rounds: {
						orderBy: [asc(rounds.roundNumber)],
					},
				},
			});

			if (!tournament) {
				throw new Error("Tournament not found");
			}

			return {
				tournament: {
					id: tournament.id,
					name: tournament.name,
					slug: tournament.slug,
					startDate: tournament.startDate,
					endDate: tournament.endDate,
				},
				rounds: tournament.rounds.map((round) => ({
					id: round.id,
					name: round.name,
					roundNumber: round.roundNumber,
					isActive: round.isActive,
					isFinalized: round.isFinalized,
					opensAt: round.opensAt,
					deadline: round.deadline,
					submissionsClosedAt: round.submissionsClosedAt,
				})),
			};
		}),

	/**
	 * Get the current user's streak information
	 */
	getUserStreak: protectedProcedure.query(async ({ ctx }) => {
		const streak = await ctx.db.query.userStreaks.findFirst({
			where: eq(userStreaks.userId, ctx.user.id),
		});

		if (!streak) {
			return {
				currentStreak: 0,
				longestStreak: 0,
				lastUpdatedAt: null,
			};
		}

		return {
			currentStreak: streak.currentStreak,
			longestStreak: streak.longestStreak,
			lastUpdatedAt: streak.lastUpdatedAt,
		};
	}),

	/**
	 * Get streaks for multiple users (for leaderboard display)
	 */
	getTopStreaks: protectedProcedure
		.input(
			z
				.object({
					limit: z.number().min(1).max(50).optional().default(10),
				})
				.optional(),
		)
		.query(async ({ ctx, input }) => {
			const limit = input?.limit ?? 10;

			const topStreaks = await ctx.db.query.userStreaks.findMany({
				orderBy: (streaks, { desc }) => [desc(streaks.currentStreak)],
				limit,
				with: {
					user: {
						columns: {
							id: true,
							displayName: true,
							imageUrl: true,
						},
					},
				},
			});

			return topStreaks
				.filter((streak) => streak.currentStreak > 0)
				.map((streak) => ({
					userId: streak.userId,
					displayName: streak.user.displayName,
					imageUrl: streak.user.imageUrl,
					currentStreak: streak.currentStreak,
					longestStreak: streak.longestStreak,
				}));
		}),
});
