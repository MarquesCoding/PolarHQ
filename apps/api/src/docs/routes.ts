import { config } from "@workspace/config"
import { type Context, Hono } from "hono"
import { z } from "zod"
import { getSessionUser } from "../context"
import type { DriveNode } from "../drive/service"
import {
  getDocKey,
  getPublicKeyByEmail,
  getUserKeys,
  replaceDocKeys,
  setDocKeys,
  setMetaKey,
  setUserKeys,
  updateKdf,
} from "./keys"
import {
  DATABASE_MIME,
  DOC_MIME,
  NOTE_MIME,
  type OrbitDocMime,
  SHEET_MIME,
  SLIDES_MIME,
  addCollaborator,
  createDoc,
  getDocForViewer,
  listCollaborators,
  listDocs,
  listSharedDocs,
  removeCollaborator,
  saveDocForEditor,
} from "./service"

type Variables = { userId: string }

export const docsRoutes = new Hono<{ Variables: Variables }>()

docsRoutes.use("*", async (c, next) => {
  const user = await getSessionUser(c.req.raw.headers)
  if (!user) return c.json({ error: "unauthorized" }, 401)
  c.set("userId", user.id)
  await next()
})

const driveBase = `${config.api.url}/api/v1/drive/nodes`

const serializeDoc = (node: DriveNode, userId: string) => ({
  id: node.id,
  parentId: node.parentId,
  name: node.name,
  encryptedName: node.encryptedName,
  sharedName: node.sharedName,
  mimeType: node.mimeType,
  sizeBytes: node.sizeBytes,
  createdAt: node.createdAt,
  updatedAt: node.updatedAt,
  owner: node.ownerId === userId,
  downloadUrl: `${driveBase}/${node.id}/download`,
})

const parse = async <T>(c: Context, schema: z.ZodType<T>) => {
  const body = await c.req.json().catch(() => null)
  return schema.safeParse(body)
}

const TYPE_MIME: Record<string, OrbitDocMime> = {
  doc: DOC_MIME,
  sheet: SHEET_MIME,
  slides: SLIDES_MIME,
  note: NOTE_MIME,
  database: DATABASE_MIME,
}
const mimeForType = (type?: string | null): OrbitDocMime =>
  (type && TYPE_MIME[type]) || DOC_MIME

docsRoutes.get("/documents", async (c) => {
  const userId = c.get("userId")
  const mime = mimeForType(c.req.query("type"))
  const [owned, shared] = await Promise.all([listDocs(userId, mime), listSharedDocs(userId, mime)])
  return c.json({
    documents: owned.map((node) => serializeDoc(node, userId)),
    shared: shared.map((node) => serializeDoc(node, userId)),
  })
})

docsRoutes.post("/documents", async (c) => {
  const parsed = await parse(
    c,
    z.object({
      parentId: z.string().nullish(),
      title: z.string().optional(),
      type: z.enum(["doc", "sheet", "slides", "note", "database"]).optional(),
    }),
  )
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  const userId = c.get("userId")
  const node = await createDoc(
    userId,
    parsed.data.parentId ?? null,
    parsed.data.title,
    mimeForType(parsed.data.type),
  )
  return c.json({ document: serializeDoc(node, userId) }, 201)
})

docsRoutes.get("/documents/:id", async (c) => {
  const userId = c.get("userId")
  const result = await getDocForViewer(userId, c.req.param("id"))
  if (!result) return c.json({ error: "not found" }, 404)
  return c.json({ document: serializeDoc(result.node, userId) })
})

docsRoutes.get("/documents/:id/content", async (c) => {
  const result = await getDocForViewer(c.get("userId"), c.req.param("id"))
  if (!result) return c.json({ error: "not found" }, 404)
  return new Response(new Uint8Array(result.bytes), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "no-store",
    },
  })
})

docsRoutes.put("/documents/:id/content", async (c) => {
  const userId = c.get("userId")
  const bytes = Buffer.from(await c.req.arrayBuffer())
  const node = await saveDocForEditor(userId, c.req.param("id"), bytes)
  if (!node) return c.json({ error: "forbidden" }, 403)
  return c.json({ document: serializeDoc(node, userId) })
})

docsRoutes.get("/documents/:id/collaborators", async (c) => {
  const collaborators = await listCollaborators(c.get("userId"), c.req.param("id"))
  return c.json({ collaborators })
})

docsRoutes.post("/documents/:id/collaborators", async (c) => {
  const parsed = await parse(
    c,
    z.object({ email: z.string().email(), role: z.enum(["editor", "viewer"]).default("editor") }),
  )
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  try {
    const collaborator = await addCollaborator(
      c.get("userId"),
      c.req.param("id"),
      parsed.data.email,
      parsed.data.role,
    )
    return c.json({ collaborator }, 201)
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400)
  }
})

docsRoutes.delete("/documents/:id/collaborators/:userId", async (c) => {
  await removeCollaborator(c.get("userId"), c.req.param("id"), c.req.param("userId"))
  return c.json({ ok: true })
})


docsRoutes.get("/keys/me", async (c) => {
  const bundle = await getUserKeys(c.get("userId"))
  return c.json({ keys: bundle })
})

docsRoutes.post("/keys", async (c) => {
  const parsed = await parse(
    c,
    z.object({
      publicKey: z.string(),
      wrappedPrivateKey: z.string(),
      kdfSalt: z.string(),
      kdfParams: z.string().nullish(),
      recoveryWrapped: z.string().nullish(),
      wrappedMetaKey: z.string().nullish(),
    }),
  )
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  await setUserKeys(c.get("userId"), {
    publicKey: parsed.data.publicKey,
    wrappedPrivateKey: parsed.data.wrappedPrivateKey,
    kdfSalt: parsed.data.kdfSalt,
    kdfParams: parsed.data.kdfParams ?? null,
    recoveryWrapped: parsed.data.recoveryWrapped ?? null,
    wrappedMetaKey: parsed.data.wrappedMetaKey ?? null,
  })
  const bundle = await getUserKeys(c.get("userId"))
  return c.json({ keys: bundle }, 201)
})

docsRoutes.put("/keys/meta", async (c) => {
  const parsed = await parse(c, z.object({ wrappedMetaKey: z.string() }))
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  await setMetaKey(c.get("userId"), parsed.data.wrappedMetaKey)
  return c.json({ ok: true })
})

docsRoutes.put("/keys/kdf", async (c) => {
  const parsed = await parse(
    c,
    z.object({ wrappedPrivateKey: z.string(), kdfSalt: z.string(), kdfParams: z.string() }),
  )
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  await updateKdf(c.get("userId"), parsed.data)
  return c.json({ ok: true })
})

docsRoutes.get("/keys/public", async (c) => {
  const email = c.req.query("email")
  if (!email) return c.json({ error: "email required" }, 400)
  const result = await getPublicKeyByEmail(email)
  if (!result) return c.json({ error: "no public key" }, 404)
  return c.json(result)
})

docsRoutes.get("/documents/:id/key", async (c) => {
  const wrappedKey = await getDocKey(c.get("userId"), c.req.param("id"))
  return c.json({ wrappedKey })
})

docsRoutes.post("/documents/:id/keys", async (c) => {
  const parsed = await parse(
    c,
    z.object({ keys: z.array(z.object({ userId: z.string(), wrappedKey: z.string() })) }),
  )
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  try {
    await setDocKeys(c.get("userId"), c.req.param("id"), parsed.data.keys)
    return c.json({ ok: true })
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400)
  }
})

docsRoutes.post("/documents/:id/keys/rotate", async (c) => {
  const parsed = await parse(
    c,
    z.object({ keys: z.array(z.object({ userId: z.string(), wrappedKey: z.string() })) }),
  )
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  try {
    await replaceDocKeys(c.get("userId"), c.req.param("id"), parsed.data.keys)
    return c.json({ ok: true })
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400)
  }
})

docsRoutes.post("/documents/:id/self-key", async (c) => {
  const parsed = await parse(c, z.object({ wrappedKey: z.string() }))
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  const userId = c.get("userId")
  try {
    await setDocKeys(userId, c.req.param("id"), [{ userId, wrappedKey: parsed.data.wrappedKey }])
    return c.json({ ok: true })
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400)
  }
})
