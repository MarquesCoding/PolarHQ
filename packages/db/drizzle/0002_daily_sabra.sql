CREATE SCHEMA "drive";
--> statement-breakpoint
CREATE SCHEMA "docs";
--> statement-breakpoint
CREATE TYPE "core"."backup_status" AS ENUM('running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "drive"."drive_node_kind" AS ENUM('folder', 'file');--> statement-breakpoint
CREATE TYPE "docs"."doc_role" AS ENUM('editor', 'viewer');--> statement-breakpoint
ALTER TYPE "core"."subject_type" ADD VALUE 'workgroup';--> statement-breakpoint
ALTER TYPE "photos"."asset_type" ADD VALUE 'audio';--> statement-breakpoint
CREATE TABLE "core"."backup_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"status" "core"."backup_status" DEFAULT 'running' NOT NULL,
	"trigger" text NOT NULL,
	"object_count" integer DEFAULT 0 NOT NULL,
	"bytes" bigint DEFAULT 0 NOT NULL,
	"error" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "core"."backup_settings" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"endpoint" text,
	"region" text,
	"bucket" text,
	"prefix" text,
	"access_key_id" text,
	"secret_access_key" text,
	"force_path_style" boolean DEFAULT true NOT NULL,
	"frequency_hours" integer DEFAULT 24 NOT NULL,
	"last_run_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."workgroup_groups" (
	"workgroup_id" text NOT NULL,
	"group_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workgroup_groups_workgroup_id_group_id_pk" PRIMARY KEY("workgroup_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "core"."workgroups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photos"."embeddings" (
	"asset_id" text NOT NULL,
	"kind" text NOT NULL,
	"model_version" text NOT NULL,
	"vector" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "embeddings_asset_id_kind_pk" PRIMARY KEY("asset_id","kind")
);
--> statement-breakpoint
CREATE TABLE "drive"."nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"parent_id" text,
	"kind" "drive"."drive_node_kind" NOT NULL,
	"name" text NOT NULL,
	"encrypted_name" text,
	"shared_name" text,
	"mime_type" text,
	"size_bytes" bigint,
	"storage_key" text,
	"photo_asset_id" text,
	"special" text,
	"lock_salt" text,
	"lock_verifier" text,
	"trashed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drive"."shares" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"node_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp,
	"max_downloads" integer,
	"download_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shares_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "drive"."versions" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"node_id" text NOT NULL,
	"name" text NOT NULL,
	"storage_key" text NOT NULL,
	"size_bytes" bigint,
	"mime_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "docs"."collaborators" (
	"id" text PRIMARY KEY NOT NULL,
	"node_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "docs"."doc_role" DEFAULT 'editor' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "docs_collaborators_node_user_uniq" UNIQUE("node_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "docs"."doc_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"node_id" text NOT NULL,
	"user_id" text NOT NULL,
	"wrapped_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "docs_doc_keys_node_user_uniq" UNIQUE("node_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "docs"."user_keys" (
	"user_id" text PRIMARY KEY NOT NULL,
	"public_key" text NOT NULL,
	"wrapped_private_key" text NOT NULL,
	"kdf_salt" text NOT NULL,
	"kdf_params" text,
	"recovery_wrapped" text,
	"wrapped_meta_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core"."instance_settings" ADD COLUMN "instance_name" text;--> statement-breakpoint
ALTER TABLE "core"."instance_settings" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "core"."instance_settings" ADD COLUMN "accent_color" text;--> statement-breakpoint
ALTER TABLE "photos"."assets" ADD COLUMN "motion_key" text;--> statement-breakpoint
ALTER TABLE "photos"."assets" ADD COLUMN "encrypted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "photos"."assets" ADD COLUMN "encrypted_name" text;--> statement-breakpoint
ALTER TABLE "photos"."assets" ADD COLUMN "encrypted_location" text;--> statement-breakpoint
ALTER TABLE "photos"."assets" ADD COLUMN "encrypted_exif" text;--> statement-breakpoint
ALTER TABLE "photos"."assets" ADD COLUMN "stack_id" text;--> statement-breakpoint
ALTER TABLE "photos"."assets" ADD COLUMN "stack_primary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "photos"."assets" ADD COLUMN "in_library" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."workgroup_groups" ADD CONSTRAINT "workgroup_groups_workgroup_id_workgroups_id_fk" FOREIGN KEY ("workgroup_id") REFERENCES "core"."workgroups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."workgroup_groups" ADD CONSTRAINT "workgroup_groups_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "core"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos"."embeddings" ADD CONSTRAINT "embeddings_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "photos"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive"."nodes" ADD CONSTRAINT "nodes_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive"."shares" ADD CONSTRAINT "shares_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive"."versions" ADD CONSTRAINT "versions_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "docs"."collaborators" ADD CONSTRAINT "collaborators_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "docs"."collaborators" ADD CONSTRAINT "collaborators_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "docs"."doc_keys" ADD CONSTRAINT "doc_keys_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "docs"."user_keys" ADD CONSTRAINT "user_keys_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "backup_runs_started_idx" ON "core"."backup_runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "drive_nodes_owner_parent_idx" ON "drive"."nodes" USING btree ("owner_id","parent_id");--> statement-breakpoint
CREATE INDEX "drive_nodes_owner_special_idx" ON "drive"."nodes" USING btree ("owner_id","special");--> statement-breakpoint
CREATE INDEX "drive_nodes_owner_trashed_idx" ON "drive"."nodes" USING btree ("owner_id","trashed_at");--> statement-breakpoint
CREATE INDEX "drive_nodes_photo_asset_idx" ON "drive"."nodes" USING btree ("photo_asset_id");--> statement-breakpoint
CREATE INDEX "drive_shares_node_idx" ON "drive"."shares" USING btree ("node_id");--> statement-breakpoint
CREATE INDEX "drive_versions_node_idx" ON "drive"."versions" USING btree ("node_id","created_at");--> statement-breakpoint
CREATE INDEX "docs_collaborators_user_idx" ON "docs"."collaborators" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "docs_collaborators_node_idx" ON "docs"."collaborators" USING btree ("node_id");--> statement-breakpoint
CREATE INDEX "docs_doc_keys_node_idx" ON "docs"."doc_keys" USING btree ("node_id");--> statement-breakpoint
CREATE INDEX "assets_owner_stack_idx" ON "photos"."assets" USING btree ("owner_id","stack_id");