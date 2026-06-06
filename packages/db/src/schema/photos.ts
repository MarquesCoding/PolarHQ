import { createId } from "@paralleldrive/cuid2"
import {
  bigint,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { user } from "./auth"

/** `photos` schema — the Photos product (Phase A: core backup & browse). */
export const photos = pgSchema("photos")

export const assetType = photos.enum("asset_type", ["image", "video", "audio"])
export const assetStatus = photos.enum("asset_status", [
  "uploading",
  "processing",
  "ready",
  "failed",
])

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => createId())

export const assets = photos.table(
  "assets",
  {
    id: id(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    checksum: text("checksum").notNull(),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    type: assetType("type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    width: integer("width"),
    height: integer("height"),
    durationMs: integer("duration_ms"),
    storageKey: text("storage_key").notNull(),
    thumbnailKey: text("thumbnail_key"),
    previewKey: text("preview_key"),
    motionKey: text("motion_key"),
    takenAt: timestamp("taken_at"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    cameraMake: text("camera_make"),
    cameraModel: text("camera_model"),
    exif: jsonb("exif"),
    encrypted: boolean("encrypted").notNull().default(false),
    encryptedName: text("encrypted_name"),
    encryptedLocation: text("encrypted_location"),
    encryptedExif: text("encrypted_exif"),
    stackId: text("stack_id"),
    stackPrimary: boolean("stack_primary").notNull().default(false),
    status: assetStatus("status").notNull().default("uploading"),
    inLibrary: boolean("in_library").notNull().default(true),
    isFavorite: boolean("is_favorite").notNull().default(false),
    isTrashed: boolean("is_trashed").notNull().default(false),
    trashedAt: timestamp("trashed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("assets_owner_checksum_uq").on(t.ownerId, t.checksum),
    index("assets_owner_taken_idx").on(t.ownerId, t.takenAt),
    index("assets_owner_created_idx").on(t.ownerId, t.createdAt),
    index("assets_owner_stack_idx").on(t.ownerId, t.stackId),
  ],
)

/**
 * On-device ML embeddings (CLIP image vectors, later face descriptors). Computed in the
 * browser and stored **encrypted** under the owner's account metadata key — the server
 * never sees the vectors, and semantic search runs entirely client-side. `vector` is the
 * base64 ciphertext of the Float32 embedding.
 */
export const embeddings = photos.table(
  "embeddings",
  {
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    modelVersion: text("model_version").notNull(),
    vector: text("vector").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.assetId, t.kind] })],
)

export const albums = photos.table("albums", {
  id: id(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  coverAssetId: text("cover_asset_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const albumAssets = photos.table(
  "album_assets",
  {
    albumId: text("album_id")
      .notNull()
      .references(() => albums.id, { onDelete: "cascade" }),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.albumId, t.assetId] })],
)

export const tags = photos.table(
  "tags",
  {
    id: id(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("tags_owner_name_uq").on(t.ownerId, t.name)],
)

export const assetTags = photos.table(
  "asset_tags",
  {
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.assetId, t.tagId] })],
)
