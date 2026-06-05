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
