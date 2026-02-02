import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	json,
	pgEnum,
	pgTableCreator,
	serial,
	text,
	timestamp,
	unique,
	varchar,
} from "drizzle-orm/pg-core";

/**
 * Table creator without prefix
 */
export const createTable = pgTableCreator((name) => name);

// Enums
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const tournamentStatusEnum = pgEnum("tournament_status", [
	"draft",
	"active",
	"archived",
]);
export const tournamentFormatEnum = pgEnum("tournament_format", ["bo3", "bo5"]);
export const matchStatusEnum = pgEnum("match_status", ["pending", "finalized"]);
export const achievementCategoryEnum = pgEnum("achievement_category", [
	"round",
	"streak",
	"milestone",
	"special",
]);

// Users table
export const users = createTable(
	"user",
	{
		id: varchar({ length: 255 }).primaryKey(), // Clerk user ID
		clerkId: varchar("clerk_id", { length: 255 }).notNull().unique(),
		email: varchar({ length: 255 }).notNull(),
		displayName: varchar("display_name", { length: 255 }).notNull(),
		imageUrl: varchar("image_url", { length: 500 }),
		role: userRoleEnum().notNull().default("user"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("user_clerk_id_idx").on(table.clerkId),
		index("user_email_idx").on(table.email),
	],
);

// Tournaments table
export const tournaments = createTable(
	"tournament",
	{
		id: serial().primaryKey(),
		name: varchar({ length: 255 }).notNull(),
		slug: varchar({ length: 255 }).notNull().unique(),
		year: integer().notNull(),
		format: tournamentFormatEnum().notNull().default("bo3"),
		atpUrl: varchar("atp_url", { length: 500 }),
		status: tournamentStatusEnum().notNull().default("draft"),
		currentRoundNumber: integer("current_round_number"),
		startDate: timestamp("start_date", { withTimezone: true }),
		endDate: timestamp("end_date", { withTimezone: true }),
		uploadedBy: varchar("uploaded_by", { length: 255 })
			.notNull()
			.references(() => users.id),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
		closedAt: timestamp("closed_at", { withTimezone: true }),
		closedBy: varchar("closed_by", { length: 255 }).references(() => users.id),
	},
	(table) => [
		index("tournament_status_idx").on(table.status),
		index("tournament_year_idx").on(table.year),
		index("tournament_slug_idx").on(table.slug),
	],
);

// Rounds table
export const rounds = createTable(
	"round",
	{
		id: serial().primaryKey(),
		tournamentId: integer("tournament_id")
			.notNull()
			.references(() => tournaments.id),
		roundNumber: integer("round_number").notNull(),
		name: varchar({ length: 100 }).notNull(),
		isActive: boolean("is_active").notNull().default(false),
		isFinalized: boolean("is_finalized").notNull().default(false),
		opensAt: timestamp("opens_at", { withTimezone: true }),
		deadline: timestamp("deadline", { withTimezone: true }),
		submissionsClosedAt: timestamp("submissions_closed_at", {
			withTimezone: true,
		}),
		submissionsClosedBy: varchar("submissions_closed_by", {
			length: 255,
		}).references(() => users.id),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("round_tournament_id_idx").on(table.tournamentId),
		index("round_is_active_idx").on(table.isActive),
		index("round_submissions_closed_idx").on(table.submissionsClosedAt),
		index("round_deadline_idx").on(table.deadline),
	],
);

// Round scoring rules table
export const roundScoringRules = createTable("round_scoring_rule", {
	id: serial().primaryKey(),
	roundId: integer("round_id")
		.notNull()
		.unique()
		.references(() => rounds.id),
	pointsPerWinner: integer("points_per_winner").notNull().default(10),
	pointsExactScore: integer("points_exact_score").notNull().default(5),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// Matches table
export const matches = createTable(
	"match",
	{
		id: serial().primaryKey(),
		roundId: integer("round_id")
			.notNull()
			.references(() => rounds.id),
		matchNumber: integer("match_number").notNull(),
		player1Name: varchar("player1_name", { length: 255 }).notNull(),
		player2Name: varchar("player2_name", { length: 255 }).notNull(),
		player1Seed: integer("player1_seed"),
		player2Seed: integer("player2_seed"),
		winnerName: varchar("winner_name", { length: 255 }),
		finalScore: varchar("final_score", { length: 50 }),
		setsWon: integer("sets_won"),
		setsLost: integer("sets_lost"),
		status: matchStatusEnum().notNull().default("pending"),
		finalizedAt: timestamp("finalized_at", { withTimezone: true }),
		finalizedBy: varchar("finalized_by", { length: 255 }).references(
			() => users.id,
		),
		isRetirement: boolean("is_retirement").notNull().default(false),
		isBye: boolean("is_bye").notNull().default(false),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("match_round_id_idx").on(table.roundId),
		index("match_status_idx").on(table.status),
	],
);

// User round picks table
export const userRoundPicks = createTable(
	"user_round_pick",
	{
		id: serial().primaryKey(),
		userId: varchar("user_id", { length: 255 })
			.notNull()
			.references(() => users.id),
		roundId: integer("round_id")
			.notNull()
			.references(() => rounds.id),
		isDraft: boolean("is_draft").notNull().default(false),
		submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
		totalPoints: integer("total_points").notNull().default(0),
		correctWinners: integer("correct_winners").notNull().default(0),
		exactScores: integer("exact_scores").notNull().default(0),
		scoredAt: timestamp("scored_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("user_round_pick_user_id_idx").on(table.userId),
		index("user_round_pick_round_id_idx").on(table.roundId),
		unique("user_round_pick_unique").on(table.userId, table.roundId),
	],
);

// Match picks table
export const matchPicks = createTable(
	"match_pick",
	{
		id: serial().primaryKey(),
		userRoundPickId: integer("user_round_pick_id")
			.notNull()
			.references(() => userRoundPicks.id, { onDelete: "cascade" }),
		matchId: integer("match_id")
			.notNull()
			.references(() => matches.id),
		predictedWinner: varchar("predicted_winner", { length: 255 }).notNull(),
		predictedSetsWon: integer("predicted_sets_won").notNull(),
		predictedSetsLost: integer("predicted_sets_lost").notNull(),
		isWinnerCorrect: boolean("is_winner_correct"),
		isExactScore: boolean("is_exact_score"),
		pointsEarned: integer("points_earned").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("match_pick_user_round_pick_id_idx").on(table.userRoundPickId),
		index("match_pick_match_id_idx").on(table.matchId),
		unique("match_pick_unique").on(table.userRoundPickId, table.matchId),
	],
);

// User streaks table (for tracking prediction streaks)
export const userStreaks = createTable(
	"user_streak",
	{
		id: serial().primaryKey(),
		userId: varchar("user_id", { length: 255 })
			.notNull()
			.unique()
			.references(() => users.id),
		currentStreak: integer("current_streak").notNull().default(0),
		longestStreak: integer("longest_streak").notNull().default(0),
		lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }),
		lastMatchId: integer("last_match_id").references(() => matches.id),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("user_streak_user_id_idx").on(table.userId),
		index("user_streak_current_streak_idx").on(table.currentStreak),
	],
);

// Achievement definitions table
export const achievementDefinitions = createTable(
	"achievement_definition",
	{
		id: serial().primaryKey(),
		code: varchar({ length: 50 }).notNull().unique(),
		name: varchar({ length: 100 }).notNull(),
		description: text().notNull(),
		category: achievementCategoryEnum().notNull(),
		iconUrl: varchar("icon_url", { length: 500 }),
		badgeColor: varchar("badge_color", { length: 50 }),
		threshold: integer(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("achievement_def_code_idx").on(table.code),
		index("achievement_def_category_idx").on(table.category),
	],
);

// User achievements table (junction table for unlocked achievements)
export const userAchievements = createTable(
	"user_achievement",
	{
		id: serial().primaryKey(),
		userId: varchar("user_id", { length: 255 })
			.notNull()
			.references(() => users.id),
		achievementId: integer("achievement_id")
			.notNull()
			.references(() => achievementDefinitions.id),
		unlockedAt: timestamp("unlocked_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		context: json().$type<{
			tournamentId?: number;
			roundId?: number;
			matchId?: number;
			value?: number;
		}>(),
		tournamentId: integer("tournament_id").references(() => tournaments.id),
		roundId: integer("round_id").references(() => rounds.id),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("user_achievement_user_id_idx").on(table.userId),
		index("user_achievement_achievement_id_idx").on(table.achievementId),
		unique("user_achievement_unique").on(table.userId, table.achievementId),
	],
);

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
	tournaments: many(tournaments),
	userRoundPicks: many(userRoundPicks),
	streak: one(userStreaks, {
		fields: [users.id],
		references: [userStreaks.userId],
	}),
	achievements: many(userAchievements),
}));

export const tournamentsRelations = relations(tournaments, ({ one, many }) => ({
	uploadedByUser: one(users, {
		fields: [tournaments.uploadedBy],
		references: [users.id],
		relationName: "uploadedByUser",
	}),
	closedByUser: one(users, {
		fields: [tournaments.closedBy],
		references: [users.id],
		relationName: "closedByUser",
	}),
	rounds: many(rounds),
}));

export const roundsRelations = relations(rounds, ({ one, many }) => ({
	tournament: one(tournaments, {
		fields: [rounds.tournamentId],
		references: [tournaments.id],
	}),
	scoringRule: one(roundScoringRules, {
		fields: [rounds.id],
		references: [roundScoringRules.roundId],
	}),
	matches: many(matches),
	userRoundPicks: many(userRoundPicks),
}));

export const roundScoringRulesRelations = relations(
	roundScoringRules,
	({ one }) => ({
		round: one(rounds, {
			fields: [roundScoringRules.roundId],
			references: [rounds.id],
		}),
	}),
);

export const matchesRelations = relations(matches, ({ one, many }) => ({
	round: one(rounds, {
		fields: [matches.roundId],
		references: [rounds.id],
	}),
	finalizedByUser: one(users, {
		fields: [matches.finalizedBy],
		references: [users.id],
	}),
	matchPicks: many(matchPicks),
}));

export const userRoundPicksRelations = relations(
	userRoundPicks,
	({ one, many }) => ({
		user: one(users, {
			fields: [userRoundPicks.userId],
			references: [users.id],
		}),
		round: one(rounds, {
			fields: [userRoundPicks.roundId],
			references: [rounds.id],
		}),
		matchPicks: many(matchPicks),
	}),
);

export const matchPicksRelations = relations(matchPicks, ({ one }) => ({
	userRoundPick: one(userRoundPicks, {
		fields: [matchPicks.userRoundPickId],
		references: [userRoundPicks.id],
	}),
	match: one(matches, {
		fields: [matchPicks.matchId],
		references: [matches.id],
	}),
}));

export const userStreaksRelations = relations(userStreaks, ({ one }) => ({
	user: one(users, {
		fields: [userStreaks.userId],
		references: [users.id],
	}),
	lastMatch: one(matches, {
		fields: [userStreaks.lastMatchId],
		references: [matches.id],
	}),
}));

export const achievementDefinitionsRelations = relations(
	achievementDefinitions,
	({ many }) => ({
		userAchievements: many(userAchievements),
	}),
);

export const userAchievementsRelations = relations(
	userAchievements,
	({ one }) => ({
		user: one(users, {
			fields: [userAchievements.userId],
			references: [users.id],
		}),
		achievement: one(achievementDefinitions, {
			fields: [userAchievements.achievementId],
			references: [achievementDefinitions.id],
		}),
		tournament: one(tournaments, {
			fields: [userAchievements.tournamentId],
			references: [tournaments.id],
		}),
		round: one(rounds, {
			fields: [userAchievements.roundId],
			references: [rounds.id],
		}),
	}),
);
