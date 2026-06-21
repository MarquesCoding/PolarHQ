import { pgSchema, text, timestamp } from "drizzle-orm/pg-core"
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
