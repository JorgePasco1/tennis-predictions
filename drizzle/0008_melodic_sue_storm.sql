ALTER TABLE "tournament" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "closed_by" varchar(255);--> statement-breakpoint
ALTER TABLE "tournament" ADD CONSTRAINT "tournament_closed_by_user_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;