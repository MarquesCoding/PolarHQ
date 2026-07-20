CREATE TABLE "drive"."tags" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"encrypted_name" text,
	"color" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drive"."node_tags" (
	"node_id" text NOT NULL,
	"tag_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "node_tags_node_id_tag_id_pk" PRIMARY KEY("node_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "drive"."tags" ADD CONSTRAINT "tags_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive"."node_tags" ADD CONSTRAINT "node_tags_node_id_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "drive"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive"."node_tags" ADD CONSTRAINT "node_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "drive"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "drive_tags_owner_idx" ON "drive"."tags" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "drive_node_tags_tag_idx" ON "drive"."node_tags" USING btree ("tag_id");