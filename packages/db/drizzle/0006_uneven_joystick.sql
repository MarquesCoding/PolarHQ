CREATE TABLE "drive"."saved_searches" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"encrypted_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "drive"."saved_searches" ADD CONSTRAINT "saved_searches_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "drive_saved_searches_owner_idx" ON "drive"."saved_searches" USING btree ("owner_id","created_at");