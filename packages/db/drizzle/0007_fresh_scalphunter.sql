CREATE SCHEMA "migrate";
--> statement-breakpoint
CREATE TABLE "migrate"."google_account" (
	"user_id" text PRIMARY KEY NOT NULL,
	"refresh_token" text NOT NULL,
	"email" text,
	"connected_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "migrate"."google_account" ADD CONSTRAINT "google_account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;