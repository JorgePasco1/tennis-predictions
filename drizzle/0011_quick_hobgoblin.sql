ALTER TABLE "tournament" ADD COLUMN "scoring_profile_key" varchar(100) DEFAULT 'classic_round_points_v1' NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "scoring_settings" json;--> statement-breakpoint
ALTER TABLE "match_pick" ADD COLUMN "scoring_variant_key" varchar(100);--> statement-breakpoint
ALTER TABLE "match_pick" ADD COLUMN "snapshot_points_per_winner" integer;--> statement-breakpoint
ALTER TABLE "match_pick" ADD COLUMN "snapshot_points_exact_score" integer;--> statement-breakpoint
ALTER TABLE "match_pick" ADD COLUMN "snapshot_context" json;
