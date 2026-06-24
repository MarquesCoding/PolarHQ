CREATE TABLE "migrate"."imported_item" (
	"user_id" text NOT NULL,
	"source" text NOT NULL,
	"google_id" text NOT NULL,
	"polar_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "imported_item_user_id_source_google_id_pk" PRIMARY KEY("user_id","source","google_id")
);
--> statement-breakpoint
ALTER TABLE "migrate"."imported_item" ADD CONSTRAINT "imported_item_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;