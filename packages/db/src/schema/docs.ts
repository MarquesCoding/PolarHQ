import { createId } from "@paralleldrive/cuid2"
import { index, pgSchema, text, timestamp, unique } from "drizzle-orm/pg-core"
import { user } from "./auth"

/** `docs` schema — collaborative documents. A doc is a Drive node; this tracks who may access it. */
export const docs = pgSchema("docs")

export const docRole = docs.enum("doc_role", ["editor", "viewer"])

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => createId())

/** Users (besides the owner) granted access to a document, keyed by the Drive node id. */
export const collaborators = docs.table(
  "collaborators",
  {
    id: id(),
    nodeId: text("node_id").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: docRole("role").notNull().default("editor"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    unique("docs_collaborators_node_user_uniq").on(t.nodeId, t.userId),
    index("docs_collaborators_user_idx").on(t.userId),
    index("docs_collaborators_node_idx").on(t.nodeId),
  ],
)

/**
 * Per-user E2E key bundle. The server only stores the public key plus the private
 * key wrapped by a password-derived key (and a recovery key) — never the password,
 * the derived key, or the plaintext private key.
 */
export const userKeys = docs.table("user_keys", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  publicKey: text("public_key").notNull(),
  wrappedPrivateKey: text("wrapped_private_key").notNull(),
  kdfSalt: text("kdf_salt").notNull(),
  kdfParams: text("kdf_params"),
  recoveryWrapped: text("recovery_wrapped"),
  // Account-wide metadata key (random symmetric key sealed to the user's public key),
  // used to encrypt node names so the server never sees them. Null for legacy accounts.
  wrappedMetaKey: text("wrapped_meta_key"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

/** A document's symmetric content key, sealed to a specific user's public key. */
export const docKeys = docs.table(
  "doc_keys",
  {
    id: id(),
    nodeId: text("node_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    wrappedKey: text("wrapped_key").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    unique("docs_doc_keys_node_user_uniq").on(t.nodeId, t.userId),
    index("docs_doc_keys_node_idx").on(t.nodeId),
  ],
)
