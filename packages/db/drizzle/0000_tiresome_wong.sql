CREATE SCHEMA "core";
--> statement-breakpoint
CREATE SCHEMA "photos";
--> statement-breakpoint
CREATE TYPE "core"."effect" AS ENUM('allow', 'deny');--> statement-breakpoint
CREATE TYPE "core"."registration_mode" AS ENUM('invite_only', 'open', 'closed');--> statement-breakpoint
CREATE TYPE "core"."scope_type" AS ENUM('global', 'app', 'resource');--> statement-breakpoint
CREATE TYPE "core"."subject_type" AS ENUM('user', 'group', 'token', 'instance');--> statement-breakpoint
CREATE TYPE "photos"."asset_status" AS ENUM('uploading', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "photos"."asset_type" AS ENUM('image', 'video');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"impersonated_by" text,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."app_enablement" (
	"id" text PRIMARY KEY NOT NULL,
	"scope_type" "core"."scope_type" NOT NULL,
	"scope_value" text,
	"app_id" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"scope_type" "core"."scope_type",
	"scope_value" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."group_members" (
	"group_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "group_members_group_id_user_id_pk" PRIMARY KEY("group_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "core"."groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."instance_settings" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"registration_mode" "core"."registration_mode" DEFAULT 'invite_only' NOT NULL,
	"allowed_email_domains" jsonb,
	"setup_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."limits" (
	"id" text PRIMARY KEY NOT NULL,
	"subject_type" "core"."subject_type" NOT NULL,
	"subject_id" text NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."permission_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"subject_type" "core"."subject_type" NOT NULL,
	"subject_id" text NOT NULL,
	"permission" text NOT NULL,
	"effect" "core"."effect" DEFAULT 'allow' NOT NULL,
	"scope_type" "core"."scope_type" DEFAULT 'global' NOT NULL,
	"scope_value" text
);
--> statement-breakpoint
CREATE TABLE "core"."role_permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL,
	"permission" text NOT NULL,
	"effect" "core"."effect" DEFAULT 'allow' NOT NULL,
	"scope_type" "core"."scope_type" DEFAULT 'global' NOT NULL,
	"scope_value" text
);
--> statement-breakpoint
CREATE TABLE "core"."roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"scope_type" "core"."scope_type" DEFAULT 'global' NOT NULL,
	"scope_value" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."subject_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"subject_type" "core"."subject_type" NOT NULL,
	"subject_id" text NOT NULL,
	"role_id" text NOT NULL,
	"scope_type" "core"."scope_type" DEFAULT 'global' NOT NULL,
	"scope_value" text
);
--> statement-breakpoint
CREATE TABLE "photos"."album_assets" (
	"album_id" text NOT NULL,
	"asset_id" text NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "album_assets_album_id_asset_id_pk" PRIMARY KEY("album_id","asset_id")
);
--> statement-breakpoint
CREATE TABLE "photos"."albums" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"cover_asset_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photos"."assets" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"checksum" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"type" "photos"."asset_type" NOT NULL,
	"size_bytes" bigint NOT NULL,
	"width" integer,
	"height" integer,
	"duration_ms" integer,
	"storage_key" text NOT NULL,
	"thumbnail_key" text,
	"preview_key" text,
	"taken_at" timestamp,
	"latitude" double precision,
	"longitude" double precision,
	"camera_make" text,
	"camera_model" text,
	"exif" jsonb,
	"status" "photos"."asset_status" DEFAULT 'uploading' NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"is_trashed" boolean DEFAULT false NOT NULL,
	"trashed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "core"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."group_members" ADD CONSTRAINT "group_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "core"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."subject_roles" ADD CONSTRAINT "subject_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "core"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos"."album_assets" ADD CONSTRAINT "album_assets_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "photos"."albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos"."album_assets" ADD CONSTRAINT "album_assets_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "photos"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos"."albums" ADD CONSTRAINT "albums_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos"."assets" ADD CONSTRAINT "assets_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "app_enablement_scope_app_uq" ON "core"."app_enablement" USING btree ("scope_type","scope_value","app_id");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "core"."audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "limits_subject_key_uq" ON "core"."limits" USING btree ("subject_type","subject_id","key");--> statement-breakpoint
CREATE INDEX "permission_grants_subject_idx" ON "core"."permission_grants" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "role_permissions_role_idx" ON "core"."role_permissions" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "subject_roles_subject_idx" ON "core"."subject_roles" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assets_owner_checksum_uq" ON "photos"."assets" USING btree ("owner_id","checksum");--> statement-breakpoint
CREATE INDEX "assets_owner_taken_idx" ON "photos"."assets" USING btree ("owner_id","taken_at");--> statement-breakpoint
CREATE INDEX "assets_owner_created_idx" ON "photos"."assets" USING btree ("owner_id","created_at");