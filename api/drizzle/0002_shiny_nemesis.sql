DROP INDEX "world_id_verifications_nullifier_hash_uidx";--> statement-breakpoint
ALTER TABLE "world_id_verifications" ADD COLUMN "action" varchar(255);--> statement-breakpoint
UPDATE "world_id_verifications" SET "action" = 'legacy';--> statement-breakpoint
ALTER TABLE "world_id_verifications" ALTER COLUMN "action" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "world_id_verifications" ADD COLUMN "signal_hash" varchar(128);--> statement-breakpoint
ALTER TABLE "world_id_verifications" ADD COLUMN "environment" varchar(32) DEFAULT 'production' NOT NULL;--> statement-breakpoint
CREATE INDEX "world_id_verifications_nullifier_hash_idx" ON "world_id_verifications" USING btree ("nullifier_hash");--> statement-breakpoint
CREATE INDEX "world_id_verifications_user_verified_at_idx" ON "world_id_verifications" USING btree ("user_id","verified_at");--> statement-breakpoint
CREATE INDEX "world_id_verifications_action_nullifier_idx" ON "world_id_verifications" USING btree ("action","nullifier_hash");
