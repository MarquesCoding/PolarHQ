import { createId } from "@paralleldrive/cuid2"
import {
  bigint,
  index,
  integer,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { user } from "./auth"

/** `drive` schema — the Drive product (files + folders, shared storage with Photos). */
export const drive = pgSchema("drive")

export const driveNodeKind = drive.enum("drive_node_kind", ["folder", "file"])

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => createId())

export const nodes = drive.table(
  "nodes",
  {
    id: id(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    parentId: text("parent_id"),
    kind: driveNodeKind("kind").notNull(),
    name: text("name").notNull(),
    encryptedName: text("encrypted_name"),
    sharedName: text("shared_name"),
    mimeType: text("mime_type"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    storageKey: text("storage_key"),
    photoAssetId: text("photo_asset_id"),
    special: text("special"),
    lockSalt: text("lock_salt"),
    lockVerifier: text("lock_verifier"),
    favoritedAt: timestamp("favorited_at"),
    trashedAt: timestamp("trashed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("drive_nodes_owner_parent_idx").on(t.ownerId, t.parentId),
    index("drive_nodes_owner_special_idx").on(t.ownerId, t.special),
    index("drive_nodes_owner_trashed_idx").on(t.ownerId, t.trashedAt),
    index("drive_nodes_owner_favorited_idx").on(t.ownerId, t.favoritedAt),
    index("drive_nodes_photo_asset_idx").on(t.photoAssetId),
  ],
)

/** Public share links for a node (unguessable token → unauthenticated download). */
export const shares = drive.table(
  "shares",
  {
    id: id(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    nodeId: text("node_id").notNull(),
    token: text("token")
      .notNull()
      .unique()
      .$defaultFn(() => createId()),
    expiresAt: timestamp("expires_at"),
    maxDownloads: integer("max_downloads"),
    downloadCount: integer("download_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("drive_shares_node_idx").on(t.nodeId)],
)

/** Prior versions of a file node, captured when a same-named file is re-uploaded. */
export const versions = drive.table(
  "versions",
  {
    id: id(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    nodeId: text("node_id").notNull(),
    name: text("name").notNull(),
    storageKey: text("storage_key").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    mimeType: text("mime_type"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("drive_versions_node_idx").on(t.nodeId, t.createdAt)],
)

/** Saved searches pinned to the sidebar. The query is a node name, so it is E2E-encrypted with the
 *  same metadata key (`name` holds a placeholder when `encryptedName` is set). */
export const savedSearches = drive.table(
  "saved_searches",
  {
    id: id(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    encryptedName: text("encrypted_name"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("drive_saved_searches_owner_idx").on(t.ownerId, t.createdAt)],
)

/** User-defined tags that can be attached to any Drive node (files and folders). */
export const driveTags = drive.table(
  "tags",
  {
    id: id(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("drive_tags_owner_name_uq").on(t.ownerId, t.name)],
)

/** Join table linking nodes to tags (many-to-many). */
export const nodeTags = drive.table(
  "node_tags",
  {
    nodeId: text("node_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => driveTags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.nodeId, t.tagId] })],
)
