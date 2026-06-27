import { can } from "@workspace/auth"
import { createMiddleware } from "hono/factory"
import { getSessionUser } from "./context"
import { getInstanceSettings } from "./instance"

/** Methods that never mutate content — always allowed, even in demo mode. */
const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

/**
 * Read-only/demo gate for the content apps (Photos, Drive, Docs). When the instance has demo mode on,
 * any mutating request (POST/PUT/PATCH/DELETE) from a non-admin is refused with 403 — so a public
 * demo can browse but not upload, edit, or delete. Admins are unaffected.
 *
 * `allowPaths` substrings stay open even for non-admins (e.g. the E2E key-management endpoints under
 * `/keys`, which a viewer still needs to unlock encryption and load content).
 */
export const demoReadOnly = (allowPaths: string[] = []) =>
  createMiddleware(async (c, next) => {
    if (READ_METHODS.has(c.req.method)) return next()
    if (allowPaths.some((fragment) => c.req.path.includes(fragment))) return next()

    const settings = await getInstanceSettings()
    if (!settings.demoMode) return next()

    const user = await getSessionUser(c.req.raw.headers)
    if (user && (await can(user.id, "admin.instance.manage"))) return next()

    return c.json({ error: "demo.readOnly" }, 403)
  })
