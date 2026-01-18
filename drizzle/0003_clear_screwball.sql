ALTER TABLE "round" ADD COLUMN "submissions_closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "round" ADD COLUMN "submissions_closed_by" varchar(255);--> statement-breakpoint
ALTER TABLE "round" ADD CONSTRAINT "round_submissions_closed_by_user_id_fk" FOREIGN KEY ("submissions_closed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "round_submissions_closed_idx" ON "round" USING btree ("submissions_closed_at");