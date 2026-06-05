import { config } from "@workspace/config"
import { type Context, Hono } from "hono"
import { z } from "zod"
import { getSessionUser } from "../context"
import type { DriveNode } from "../drive/service"
import { createDoc, getDocContent, listDocs, saveDocContent } from "./service"

type Variables = { userId: string }

export const docsRoutes = new Hono<{ Variables: Variables }>()

docsRoutes.use("*", async (c, next) => {
  const user = await getSessionUser(c.req.raw.headers)
  if (!user) return c.json({ error: "unauthorized" }, 401)
  c.set("userId", user.id)
  await next()
})

const driveBase = `${config.api.url}/api/v1/drive/nodes`

const serializeDoc = (node: DriveNode) => ({
  id: node.id,
  parentId: node.parentId,
  name: node.name,
  mimeType: node.mimeType,
  sizeBytes: node.sizeBytes,
  createdAt: node.createdAt,
  updatedAt: node.updatedAt,
  downloadUrl: `${driveBase}/${node.id}/download`,
})

const parse = async <T>(c: Context, schema: z.ZodType<T>) => {
  const body = await c.req.json().catch(() => null)
  return schema.safeParse(body)
}

docsRoutes.get("/documents", async (c) => {
  const docs = await listDocs(c.get("userId"))
  return c.json({ documents: docs.map(serializeDoc) })
})

docsRoutes.post("/documents", async (c) => {
  const parsed = await parse(
    c,
    z.object({ parentId: z.string().nullish(), title: z.string().optional() }),
  )
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  const node = await createDoc(c.get("userId"), parsed.data.parentId ?? null, parsed.data.title)
  return c.json({ document: serializeDoc(node) }, 201)
})

docsRoutes.get("/documents/:id", async (c) => {
  const result = await getDocContent(c.get("userId"), c.req.param("id"))
  if (!result) return c.json({ error: "not found" }, 404)
  return c.json({ document: serializeDoc(result.node) })
})

docsRoutes.get("/documents/:id/content", async (c) => {
  const result = await getDocContent(c.get("userId"), c.req.param("id"))
  if (!result) return c.json({ error: "not found" }, 404)
  return new Response(new Uint8Array(result.bytes), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "no-store",
    },
  })
})

docsRoutes.put("/documents/:id/content", async (c) => {
  const bytes = Buffer.from(await c.req.arrayBuffer())
  const node = await saveDocContent(c.get("userId"), c.req.param("id"), bytes)
  if (!node) return c.json({ error: "not found" }, 404)
  return c.json({ document: serializeDoc(node) })
})
