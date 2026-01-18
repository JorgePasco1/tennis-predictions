import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "~/server/db/schema";
import {
	achievementDefinitions,
	matchPicks,
	rounds,
	userAchievements,
	userRoundPicks,
	userStreaks,
} from "~/server/db/schema";

// Achievement code constants
export const ACHIEVEMENT_CODES = {
	PERFECT_ROUND: "PERFECT_ROUND",
	EXACT_MASTER: "EXACT_MASTER",
	STREAK_5: "STREAK_5",
	STREAK_10: "STREAK_10",
	FIRST_100_POINTS: "FIRST_100_POINTS",
	FIRST_RANK_1: "FIRST_RANK_1",
	UPSET_CALLER: "UPSET_CALLER",
	EARLY_BIRD: "EARLY_BIRD",
} as const;

export type AchievementCode =
	(typeof ACHIEVEMENT_CODES)[keyof typeof ACHIEVEMENT_CODES];

// Achievement definitions for seeding
export const ACHIEVEMENT_DEFINITIONS = [
	{
		code: ACHIEVEMENT_CODES.PERFECT_ROUND,
		name: "Perfect Round",
		description: "Get 100% correct winners in a round",
		category: "round" as const,
		badgeColor: "gold",
		threshold: 100,
	},
	{
		code: ACHIEVEMENT_CODES.EXACT_MASTER,
		name: "Exact Master",
		description: "Get 3 or more exact scores in one round",
		category: "round" as const,
		badgeColor: "purple",
		threshold: 3,
	},
	{
		code: ACHIEVEMENT_CODES.STREAK_5,
		name: "On Fire",
		description: "Get 5 consecutive correct predictions",
		category: "streak" as const,
		badgeColor: "orange",
		threshold: 5,
	},
	{
		code: ACHIEVEMENT_CODES.STREAK_10,
		name: "Streak Master",
		description: "Get 10 consecutive correct predictions",
		category: "streak" as const,
		badgeColor: "red",
		threshold: 10,
	},
	{
		code: ACHIEVEMENT_CODES.FIRST_100_POINTS,
		name: "Century Club",
		description: "Earn 100 total points",
		category: "milestone" as const,
		badgeColor: "blue",
		threshold: 100,
	},
	{
		code: ACHIEVEMENT_CODES.FIRST_RANK_1,
		name: "Champion",
		description: "Reach #1 on a tournament leaderboard",
		category: "milestone" as const,
		badgeColor: "gold",
		threshold: 1,
	},
	{
		code: ACHIEVEMENT_CODES.UPSET_CALLER,
		name: "Upset Caller",
		description: "Correctly predict a major upset (top 8 seed losing)",
		category: "special" as const,
		badgeColor: "teal",
	},
	{
		code: ACHIEVEMENT_CODES.EARLY_BIRD,
		name: "Early Bird",
		description: "Submit picks within 1 hour of round opening",
		category: "special" as const,
		badgeColor: "green",
	},
];

interface AchievementContext {
	tournamentId?: number;
	roundId?: number;
	matchId?: number;
	value?: number;
}

/**
 * Award an achievement to a user
 */
export async function awardAchievement(
	db: NodePgDatabase<typeof schema>,
	userId: string,
	achievementCode: AchievementCode,
	context?: AchievementContext,
): Promise<boolean> {
	// Get the achievement definition
	const achievement = await db.query.achievementDefinitions.findFirst({
		where: eq(achievementDefinitions.code, achievementCode),
	});

	if (!achievement) {
		console.error(`Achievement ${achievementCode} not found`);
		return false;
	}

	// Check if user already has this achievement
	const existing = await db.query.userAchievements.findFirst({
		where: and(
			eq(userAchievements.userId, userId),
			eq(userAchievements.achievementId, achievement.id),
		),
	});

	if (existing) {
		return false; // Already has achievement
	}

	// Award the achievement
	await db.insert(userAchievements).values({
		userId,
		achievementId: achievement.id,
		tournamentId: context?.tournamentId,
		roundId: context?.roundId,
		context: context ?? null,
	});

	return true;
}

/**
 * Check and award streak-based achievements
 */
export async function checkStreakAchievements(
	db: NodePgDatabase<typeof schema>,
	userId: string,
): Promise<AchievementCode[]> {
	const awarded: AchievementCode[] = [];

	// Get user's current streak
	const streak = await db.query.userStreaks.findFirst({
		where: eq(userStreaks.userId, userId),
	});

	if (!streak) return awarded;

	// Check for streak milestones
	if (streak.currentStreak >= 5) {
		const didAward = await awardAchievement(
			db,
			userId,
			ACHIEVEMENT_CODES.STREAK_5,
			{ value: streak.currentStreak },
		);
		if (didAward) awarded.push(ACHIEVEMENT_CODES.STREAK_5);
	}

	if (streak.currentStreak >= 10) {
		const didAward = await awardAchievement(
			db,
			userId,
			ACHIEVEMENT_CODES.STREAK_10,
			{ value: streak.currentStreak },
		);
		if (didAward) awarded.push(ACHIEVEMENT_CODES.STREAK_10);
	}

	return awarded;
}

/**
 * Check and award round-based achievements after a round is scored
 */
export async function checkRoundAchievements(
	db: NodePgDatabase<typeof schema>,
	userId: string,
	roundId: number,
): Promise<AchievementCode[]> {
	const awarded: AchievementCode[] = [];

	// Get user's round picks with match details
	const userRoundPick = await db.query.userRoundPicks.findFirst({
		where: and(
			eq(userRoundPicks.userId, userId),
			eq(userRoundPicks.roundId, roundId),
		),
	});

	if (!userRoundPick) return awarded;

	// Get all match picks for this round
	const picks = await db.query.matchPicks.findMany({
		where: eq(matchPicks.userRoundPickId, userRoundPick.id),
	});

	// Get round details
	const round = await db.query.rounds.findFirst({
		where: eq(rounds.id, roundId),
		with: { matches: true },
	});

	if (!round) return awarded;

	// Check for Perfect Round (100% correct winners)
	const scoredPicks = picks.filter((p) => p.isWinnerCorrect !== null);
	const correctWinners = picks.filter((p) => p.isWinnerCorrect === true);

	if (
		scoredPicks.length > 0 &&
		scoredPicks.length === correctWinners.length &&
		scoredPicks.length === round.matches.length
	) {
		const didAward = await awardAchievement(
			db,
			userId,
			ACHIEVEMENT_CODES.PERFECT_ROUND,
			{ roundId, tournamentId: round.tournamentId, value: scoredPicks.length },
		);
		if (didAward) awarded.push(ACHIEVEMENT_CODES.PERFECT_ROUND);
	}

	// Check for Exact Master (3+ exact scores)
	const exactScores = picks.filter((p) => p.isExactScore === true);
	if (exactScores.length >= 3) {
		const didAward = await awardAchievement(
			db,
			userId,
			ACHIEVEMENT_CODES.EXACT_MASTER,
			{ roundId, tournamentId: round.tournamentId, value: exactScores.length },
		);
		if (didAward) awarded.push(ACHIEVEMENT_CODES.EXACT_MASTER);
	}

	return awarded;
}

/**
 * Check and award Early Bird achievement
 */
export async function checkEarlyBirdAchievement(
	db: NodePgDatabase<typeof schema>,
	userId: string,
	roundId: number,
	submittedAt: Date,
): Promise<boolean> {
	// Get round details
	const round = await db.query.rounds.findFirst({
		where: eq(rounds.id, roundId),
	});

	if (!round || !round.opensAt) return false;

	// Check if submitted within 1 hour of opening
	const opensAt = new Date(round.opensAt);
	const oneHourAfterOpen = new Date(opensAt.getTime() + 60 * 60 * 1000);

	if (submittedAt <= oneHourAfterOpen) {
		return await awardAchievement(db, userId, ACHIEVEMENT_CODES.EARLY_BIRD, {
			roundId,
			tournamentId: round.tournamentId,
		});
	}

	return false;
}

/**
 * Check all achievements for a user after scoring
 * Called after match finalization
 */
export async function evaluateAchievementsAfterScoring(
	db: NodePgDatabase<typeof schema>,
	userId: string,
	roundId: number,
): Promise<AchievementCode[]> {
	const awarded: AchievementCode[] = [];

	// Check streak achievements
	const streakAchievements = await checkStreakAchievements(db, userId);
	awarded.push(...streakAchievements);

	// Check round achievements
	const roundAchievements = await checkRoundAchievements(db, userId, roundId);
	awarded.push(...roundAchievements);

	return awarded;
}
