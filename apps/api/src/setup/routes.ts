import { Hono } from "hono"
import { z } from "zod"
import { SetupError, completeSetup, getSetupStatus } from "./service"

const CompleteSetupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  registrationMode: z.enum(["invite_only", "open", "closed"]).optional(),
})

export const setupRoutes = new Hono()

setupRoutes.get("/status", async (c) => {
  return c.json(await getSetupStatus())
})

setupRoutes.post("/", async (c) => {
  const parsed = CompleteSetupSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) {
    return c.json({ error: "invalid input", issues: parsed.error.issues }, 400)
  }

  try {
    const result = await completeSetup(parsed.data)
    return c.json(result, 201)
  } catch (error) {
    if (error instanceof SetupError) return c.json({ error: error.message }, 409)
    throw error
  }
})
