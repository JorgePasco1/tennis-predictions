ALTER TYPE "public"."tournament_source" ADD VALUE IF NOT EXISTS 'football_data';--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "external_competition_code" varchar(50);
