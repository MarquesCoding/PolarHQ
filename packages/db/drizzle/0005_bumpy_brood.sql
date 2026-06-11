ALTER TABLE "drive"."nodes" ADD COLUMN "favorited_at" timestamp;--> statement-breakpoint
CREATE INDEX "drive_nodes_owner_favorited_idx" ON "drive"."nodes" USING btree ("owner_id","favorited_at");