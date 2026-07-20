CREATE TABLE "drive"."devices" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"device_id" text NOT NULL,
	"name" text NOT NULL,
	"platform" text NOT NULL,
	"kind" text NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "drive"."devices" ADD CONSTRAINT "devices_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "drive_devices_owner_device_uq" ON "drive"."devices" USING btree ("owner_id","device_id");--> statement-breakpoint
CREATE INDEX "drive_devices_owner_idx" ON "drive"."devices" USING btree ("owner_id","last_seen_at");