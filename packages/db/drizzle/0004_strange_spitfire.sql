DROP TABLE "core"."workgroup_groups" CASCADE;--> statement-breakpoint
DROP TABLE "core"."workgroups" CASCADE;--> statement-breakpoint
ALTER TABLE "core"."limits" ALTER COLUMN "subject_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "core"."permission_grants" ALTER COLUMN "subject_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "core"."subject_roles" ALTER COLUMN "subject_type" SET DATA TYPE text;--> statement-breakpoint
DELETE FROM "core"."limits" WHERE "subject_type" = 'workgroup';--> statement-breakpoint
DELETE FROM "core"."permission_grants" WHERE "subject_type" = 'workgroup';--> statement-breakpoint
DELETE FROM "core"."subject_roles" WHERE "subject_type" = 'workgroup';--> statement-breakpoint
DROP TYPE "core"."subject_type";--> statement-breakpoint
CREATE TYPE "core"."subject_type" AS ENUM('user', 'group', 'token', 'instance');--> statement-breakpoint
ALTER TABLE "core"."limits" ALTER COLUMN "subject_type" SET DATA TYPE "core"."subject_type" USING "subject_type"::"core"."subject_type";--> statement-breakpoint
ALTER TABLE "core"."permission_grants" ALTER COLUMN "subject_type" SET DATA TYPE "core"."subject_type" USING "subject_type"::"core"."subject_type";--> statement-breakpoint
ALTER TABLE "core"."subject_roles" ALTER COLUMN "subject_type" SET DATA TYPE "core"."subject_type" USING "subject_type"::"core"."subject_type";