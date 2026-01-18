import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { achievementDefinitions, userAchievements } from "~/server/db/schema";

export const achievementsRouter = createTRPCRouter({
	/**
	 * Get all achievement definitions
	 */
	getAll: protectedProcedure.query(async ({ ctx }) => {
		const achievements = await ctx.db.query.achievementDefinitions.findMany({
			orderBy: [achievementDefinitions.category, achievementDefinitions.name],
		});

		return achievements;
	}),

	/**
	 * Get current user's achievements
	 */
	getUserAchievements: protectedProcedure.query(async ({ ctx }) => {
		const achievements = await ctx.db.query.userAchievements.findMany({
			where: eq(userAchievements.userId, ctx.user.id),
			orderBy: [desc(userAchievements.unlockedAt)],
			with: {
				achievement: true,
				tournament: {
					columns: {
						id: true,
						name: true,
						slug: true,
					},
				},
				round: {
					columns: {
						id: true,
						name: true,
					},
				},
			},
		});

		return achievements;
	}),

	/**
	 * Get a specific user's achievements (for viewing other users' profiles)
	 */
	getAchievementsForUser: protectedProcedure
		.input(
			z.object({
				userId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const achievements = await ctx.db.query.userAchievements.findMany({
				where: eq(userAchievements.userId, input.userId),
				orderBy: [desc(userAchievements.unlockedAt)],
				with: {
					achievement: true,
					tournament: {
						columns: {
							id: true,
							name: true,
							slug: true,
						},
					},
					round: {
						columns: {
							id: true,
							name: true,
						},
					},
				},
			});

			return achievements;
		}),

	/**
	 * Get recent achievement unlocks across all users
	 */
	getRecentUnlocks: protectedProcedure
		.input(
			z
				.object({
					limit: z.number().min(1).max(50).optional().default(10),
				})
				.optional(),
		)
		.query(async ({ ctx, input }) => {
			const limit = input?.limit ?? 10;

			const recentUnlocks = await ctx.db.query.userAchievements.findMany({
				orderBy: [desc(userAchievements.unlockedAt)],
				limit,
				with: {
					achievement: true,
					user: {
						columns: {
							id: true,
							displayName: true,
							imageUrl: true,
						},
					},
					tournament: {
						columns: {
							id: true,
							name: true,
							slug: true,
						},
					},
				},
			});

			return recentUnlocks;
		}),

	/**
	 * Get user's achievement summary (count by category)
	 */
	getUserSummary: protectedProcedure.query(async ({ ctx }) => {
		// Get all definitions
		const allDefinitions = await ctx.db.query.achievementDefinitions.findMany();

		// Get user's unlocked achievements
		const userUnlocked = await ctx.db.query.userAchievements.findMany({
			where: eq(userAchievements.userId, ctx.user.id),
		});

		const unlockedIds = new Set(userUnlocked.map((ua) => ua.achievementId));

		// Group by category
		const summary = {
			round: { total: 0, unlocked: 0 },
			streak: { total: 0, unlocked: 0 },
			milestone: { total: 0, unlocked: 0 },
			special: { total: 0, unlocked: 0 },
		};

		for (const def of allDefinitions) {
			const category = def.category as keyof typeof summary;
			if (summary[category]) {
				summary[category].total++;
				if (unlockedIds.has(def.id)) {
					summary[category].unlocked++;
				}
			}
		}

		return {
			totalAchievements: allDefinitions.length,
			unlockedCount: userUnlocked.length,
			byCategory: summary,
		};
	}),

	/**
	 * Get achievement leaderboard (users with most achievements)
	 */
	getLeaderboard: protectedProcedure
		.input(
			z
				.object({
					limit: z.number().min(1).max(50).optional().default(10),
				})
				.optional(),
		)
		.query(async ({ ctx, input }) => {
			const limit = input?.limit ?? 10;

			// Get all user achievements with user info
			const allUserAchievements = await ctx.db.query.userAchievements.findMany({
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

			// Count achievements per user
			const userCounts = new Map<
				string,
				{
					userId: string;
					displayName: string;
					imageUrl: string | null;
					count: number;
				}
			>();

			for (const ua of allUserAchievements) {
				const existing = userCounts.get(ua.userId);
				if (existing) {
					existing.count++;
				} else {
					userCounts.set(ua.userId, {
						userId: ua.userId,
						displayName: ua.user.displayName,
						imageUrl: ua.user.imageUrl,
						count: 1,
					});
				}
			}

			// Sort by count and return top users
			const sorted = Array.from(userCounts.values())
				.sort((a, b) => b.count - a.count)
				.slice(0, limit);

			return sorted;
		}),
});
