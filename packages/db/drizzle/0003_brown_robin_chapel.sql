CREATE TYPE "core"."backup_provider" AS ENUM('s3', 'gdrive');--> statement-breakpoint
ALTER TABLE "core"."backup_settings" ADD COLUMN "provider" "core"."backup_provider" DEFAULT 's3' NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."backup_settings" ADD COLUMN "gdrive_refresh_token" text;--> statement-breakpoint
ALTER TABLE "core"."backup_settings" ADD COLUMN "gdrive_folder_id" text;