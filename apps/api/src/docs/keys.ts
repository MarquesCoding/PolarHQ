import { db, schema } from "@workspace/db"
import { and, eq, inArray } from "drizzle-orm"
import { getNode } from "../drive/service"
import { canAccessDoc } from "./service"

export interface UserKeyBundle {
  publicKey: string
  wrappedPrivateKey: string
  kdfSalt: string
  recoveryWrapped: string | null
}

/** The caller's own key bundle (public key + wrapped private key), or null if not set up. */
export const getUserKeys = async (userId: string): Promise<UserKeyBundle | null> => {
  const row = (
    await db.select().from(schema.userKeys).where(eq(schema.userKeys.userId, userId)).limit(1)
  )[0]
  if (!row) return null
  return {
    publicKey: row.publicKey,
    wrappedPrivateKey: row.wrappedPrivateKey,
    kdfSalt: row.kdfSalt,
    recoveryWrapped: row.recoveryWrapped,
  }
}

/** Store a user's key bundle once (no-op if already set up). The server never sees the private key. */
export const setUserKeys = async (userId: string, bundle: UserKeyBundle): Promise<void> => {
  await db
    .insert(schema.userKeys)
    .values({
      userId,
      publicKey: bundle.publicKey,
      wrappedPrivateKey: bundle.wrappedPrivateKey,
      kdfSalt: bundle.kdfSalt,
      recoveryWrapped: bundle.recoveryWrapped,
    })
    .onConflictDoNothing()
}

/** Resolve a user (by email) to their public key — used to wrap a doc key when sharing. */
export const getPublicKeyByEmail = async (
  email: string,
): Promise<{ userId: string; publicKey: string } | null> => {
  const target = (
    await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, email.trim().toLowerCase()))
      .limit(1)
  )[0]
  if (!target) return null
  const row = (
    await db
      .select({ publicKey: schema.userKeys.publicKey })
      .from(schema.userKeys)
      .where(eq(schema.userKeys.userId, target.id))
      .limit(1)
  )[0]
  if (!row) return null
  return { userId: target.id, publicKey: row.publicKey }
}

/** Of the given node ids, which the user holds an E2E content key for (i.e. are encrypted). */
export const nodesWithKeys = async (userId: string, nodeIds: string[]): Promise<Set<string>> => {
  if (nodeIds.length === 0) return new Set()
  const rows = await db
    .select({ nodeId: schema.docKeys.nodeId })
    .from(schema.docKeys)
    .where(and(eq(schema.docKeys.userId, userId), inArray(schema.docKeys.nodeId, nodeIds)))
  return new Set(rows.map((row) => row.nodeId))
}

/** The document's content key wrapped to this user, if they have access and a key exists. */
export const getDocKey = async (userId: string, nodeId: string): Promise<string | null> => {
  if (!(await canAccessDoc(userId, nodeId))) return null
  const row = (
    await db
      .select({ wrappedKey: schema.docKeys.wrappedKey })
      .from(schema.docKeys)
      .where(and(eq(schema.docKeys.nodeId, nodeId), eq(schema.docKeys.userId, userId)))
      .limit(1)
  )[0]
  return row?.wrappedKey ?? null
}

/** Store the (already-wrapped) content key for one or more users. Owner-only. */
export const setDocKeys = async (
  ownerId: string,
  nodeId: string,
  entries: { userId: string; wrappedKey: string }[],
): Promise<void> => {
  const node = await getNode(ownerId, nodeId)
  if (!node) throw new Error("not found")
  for (const entry of entries) {
    if (entry.userId !== ownerId) {
      const collab = (
        await db
          .select({ id: schema.collaborators.id })
          .from(schema.collaborators)
          .where(
            and(
              eq(schema.collaborators.nodeId, nodeId),
              eq(schema.collaborators.userId, entry.userId),
              eq(schema.collaborators.ownerId, ownerId),
            ),
          )
          .limit(1)
      )[0]
      if (!collab) continue
    }
    await db
      .insert(schema.docKeys)
      .values({ nodeId, userId: entry.userId, wrappedKey: entry.wrappedKey })
      .onConflictDoUpdate({
        target: [schema.docKeys.nodeId, schema.docKeys.userId],
        set: { wrappedKey: entry.wrappedKey },
      })
  }
}
