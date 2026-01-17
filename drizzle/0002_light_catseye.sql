ALTER TABLE "match_pick" DROP CONSTRAINT "match_pick_user_round_pick_id_user_round_pick_id_fk";
--> statement-breakpoint
ALTER TABLE "match_pick" ADD CONSTRAINT "match_pick_user_round_pick_id_user_round_pick_id_fk" FOREIGN KEY ("user_round_pick_id") REFERENCES "public"."user_round_pick"("id") ON DELETE cascade ON UPDATE no action;