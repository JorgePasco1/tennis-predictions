CREATE TYPE "public"."match_kind" AS ENUM('standard', 'two_leg_tie', 'single_match');--> statement-breakpoint
CREATE TYPE "public"."tournament_source" AS ENUM('parser', 'api_football');--> statement-breakpoint
CREATE TYPE "public"."tournament_sport" AS ENUM('tennis', 'football');--> statement-breakpoint
ALTER TABLE "match" ADD COLUMN "kind" "match_kind" DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "match" ADD COLUMN "metadata" json;--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "sport" "tournament_sport" DEFAULT 'tennis' NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "source" "tournament_source" DEFAULT 'parser' NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "external_league_id" integer;--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "external_season" integer;
