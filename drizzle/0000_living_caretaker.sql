CREATE TYPE "public"."match_status" AS ENUM('pending', 'finalized');--> statement-breakpoint
CREATE TYPE "public"."tournament_format" AS ENUM('bo3', 'bo5');--> statement-breakpoint
CREATE TYPE "public"."tournament_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "match_pick" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_round_pick_id" integer NOT NULL,
	"match_id" integer NOT NULL,
	"predicted_winner" varchar(255) NOT NULL,
	"predicted_sets_won" integer NOT NULL,
	"predicted_sets_lost" integer NOT NULL,
	"is_winner_correct" boolean,
	"is_exact_score" boolean,
	"points_earned" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_pick_unique" UNIQUE("user_round_pick_id","match_id")
);
--> statement-breakpoint
CREATE TABLE "match" (
	"id" serial PRIMARY KEY NOT NULL,
	"round_id" integer NOT NULL,
	"match_number" integer NOT NULL,
	"player1_name" varchar(255) NOT NULL,
	"player2_name" varchar(255) NOT NULL,
	"player1_seed" integer,
	"player2_seed" integer,
	"winner_name" varchar(255),
	"final_score" varchar(50),
	"sets_won" integer,
	"sets_lost" integer,
	"status" "match_status" DEFAULT 'pending' NOT NULL,
	"finalized_at" timestamp with time zone,
	"finalized_by" varchar(255),
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "round_scoring_rule" (
	"id" serial PRIMARY KEY NOT NULL,
	"round_id" integer NOT NULL,
	"points_per_winner" integer DEFAULT 10 NOT NULL,
	"points_exact_score" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "round_scoring_rule_round_id_unique" UNIQUE("round_id")
);
--> statement-breakpoint
CREATE TABLE "round" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"round_number" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"is_finalized" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"year" integer NOT NULL,
	"format" "tournament_format" DEFAULT 'bo3' NOT NULL,
	"status" "tournament_status" DEFAULT 'draft' NOT NULL,
	"current_round_number" integer,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"uploaded_by" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "tournament_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_round_pick" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"round_id" integer NOT NULL,
	"is_draft" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp with time zone NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"correct_winners" integer DEFAULT 0 NOT NULL,
	"exact_scores" integer DEFAULT 0 NOT NULL,
	"scored_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_round_pick_unique" UNIQUE("user_id","round_id")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"clerk_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
ALTER TABLE "match_pick" ADD CONSTRAINT "match_pick_user_round_pick_id_user_round_pick_id_fk" FOREIGN KEY ("user_round_pick_id") REFERENCES "public"."user_round_pick"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_pick" ADD CONSTRAINT "match_pick_match_id_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."match"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_round_id_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."round"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_finalized_by_user_id_fk" FOREIGN KEY ("finalized_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_scoring_rule" ADD CONSTRAINT "round_scoring_rule_round_id_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."round"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round" ADD CONSTRAINT "round_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament" ADD CONSTRAINT "tournament_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_round_pick" ADD CONSTRAINT "user_round_pick_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_round_pick" ADD CONSTRAINT "user_round_pick_round_id_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."round"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "match_pick_user_round_pick_id_idx" ON "match_pick" USING btree ("user_round_pick_id");--> statement-breakpoint
CREATE INDEX "match_pick_match_id_idx" ON "match_pick" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "match_round_id_idx" ON "match" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "match_status_idx" ON "match" USING btree ("status");--> statement-breakpoint
CREATE INDEX "round_tournament_id_idx" ON "round" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "round_is_active_idx" ON "round" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "tournament_status_idx" ON "tournament" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tournament_year_idx" ON "tournament" USING btree ("year");--> statement-breakpoint
CREATE INDEX "tournament_slug_idx" ON "tournament" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "user_round_pick_user_id_idx" ON "user_round_pick" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_round_pick_round_id_idx" ON "user_round_pick" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "user_clerk_id_idx" ON "user" USING btree ("clerk_id");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" USING btree ("email");