import { pgSchema, primaryKey, text, timestamp } from "drizzle-orm/pg-core"
import { user } from "./auth"

/** `migrate` schema — third-party import connections (Google, …) for user-initiated migrations. */
export const migrate = pgSchema("migrate")

/**
 * A user's connected Google account, used to import their Google Photos / Drive into PolarHQ. One row
 * per user. We store only the OAuth refresh token (server-side) to mint short-lived access tokens; the
 * imported content is encrypted client-side before storage, so the server never persists plaintext.
 */
export const googleAccount = migrate.table("google_account", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  refreshToken: text("refresh_token").notNull(),
  email: text("email"),
  connectedAt: timestamp("connected_at").notNull().defaultNow(),
})

/**
 * A ledger of items already imported, so re-running an import skips what's done (resumability). Keyed by
 * the source's id (Google media/file/folder id). For folders we keep the created PolarHQ node id in
 * `polarId` so a resumed Drive import can map children into the existing tree instead of duplicating it.
 * Only ids are stored — never content — so this stays compatible with end-to-end encryption.
 */
export const importedItem = migrate.table(
  "imported_item",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    googleId: text("google_id").notNull(),
    polarId: text("polar_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.source, table.googleId] })],
)
