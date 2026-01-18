CREATE TYPE "public"."achievement_category" AS ENUM('round', 'streak', 'milestone', 'special');--> statement-breakpoint
CREATE TABLE "achievement_definition" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"category" "achievement_category" NOT NULL,
	"icon_url" varchar(500),
	"badge_color" varchar(50),
	"threshold" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "achievement_definition_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "user_achievement" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"achievement_id" integer NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"context" json,
	"tournament_id" integer,
	"round_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_achievement_unique" UNIQUE("user_id","achievement_id")
);
--> statement-breakpoint
CREATE TABLE "user_streak" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_updated_at" timestamp with time zone,
	"last_match_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_streak_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "round" ADD COLUMN "opens_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "round" ADD COLUMN "deadline" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_achievement" ADD CONSTRAINT "user_achievement_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievement" ADD CONSTRAINT "user_achievement_achievement_id_achievement_definition_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievement_definition"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievement" ADD CONSTRAINT "user_achievement_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievement" ADD CONSTRAINT "user_achievement_round_id_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."round"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_streak" ADD CONSTRAINT "user_streak_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_streak" ADD CONSTRAINT "user_streak_last_match_id_match_id_fk" FOREIGN KEY ("last_match_id") REFERENCES "public"."match"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "achievement_def_code_idx" ON "achievement_definition" USING btree ("code");--> statement-breakpoint
CREATE INDEX "achievement_def_category_idx" ON "achievement_definition" USING btree ("category");--> statement-breakpoint
CREATE INDEX "user_achievement_user_id_idx" ON "user_achievement" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_achievement_achievement_id_idx" ON "user_achievement" USING btree ("achievement_id");--> statement-breakpoint
CREATE INDEX "user_streak_user_id_idx" ON "user_streak" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_streak_current_streak_idx" ON "user_streak" USING btree ("current_streak");--> statement-breakpoint
CREATE INDEX "round_deadline_idx" ON "round" USING btree ("deadline");