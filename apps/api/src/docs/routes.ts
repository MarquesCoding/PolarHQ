import { config } from "@workspace/config"
import { type Context, Hono } from "hono"
import { z } from "zod"
import { getSessionUser } from "../context"
import type { DriveNode } from "../drive/service"
import {
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

docsRoutes.get("/documents", async (c) => {
  const userId = c.get("userId")
  const [owned, shared] = await Promise.all([listDocs(userId), listSharedDocs(userId)])
  return c.json({
    documents: owned.map((node) => serializeDoc(node, userId)),
    shared: shared.map((node) => serializeDoc(node, userId)),
  })
})

docsRoutes.post("/documents", async (c) => {
  const parsed = await parse(
    c,
    z.object({ parentId: z.string().nullish(), title: z.string().optional() }),
  )
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  const userId = c.get("userId")
  const node = await createDoc(userId, parsed.data.parentId ?? null, parsed.data.title)
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
