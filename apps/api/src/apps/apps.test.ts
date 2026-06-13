import { db, schema } from "@polarhq/db"
import { eq } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { getRoleByName, seedSystemRoles } from "../admin/roles"
import { registerPhotosModule } from "../photos/module"
import { registerAppsModule } from "./registry"
import { getAppsForUser } from "./service"

describe("app registry", () => {
  const userId = `apps-user-${Date.now()}`

  beforeAll(async () => {
    registerAppsModule()
    registerPhotosModule()
    await seedSystemRoles()
    await db
      .insert(schema.user)
      .values({ id: userId, name: "Apps Tester", email: `${userId}@orbit.test`, emailVerified: true })
      .onConflictDoNothing()
    const userRole = await getRoleByName("User")
    await db.insert(schema.subjectRoles).values({
      subjectType: "user",
      subjectId: userId,
      roleId: userRole!.id,
      scopeType: "global",
    })
  })

  afterAll(async () => {
    await db.delete(schema.subjectRoles).where(eq(schema.subjectRoles.subjectId, userId))
    await db.delete(schema.user).where(eq(schema.user.id, userId))
  })

  it("marks Photos available and coming-soon apps unavailable", async () => {
    const apps = await getAppsForUser(userId)
    const photos = apps.find((app) => app.id === "photos")
    const drive = apps.find((app) => app.id === "drive")

    expect(apps.length).toBeGreaterThanOrEqual(9)
    expect(photos?.available).toBe(true)
    expect(drive?.status).toBe("coming_soon")
    expect(drive?.available).toBe(false)
  })

  it("denies apps to a user without the required permission", async () => {
    const strangerId = `stranger-${Date.now()}`
    await db
      .insert(schema.user)
      .values({ id: strangerId, name: "Stranger", email: `${strangerId}@orbit.test`, emailVerified: true })

    const apps = await getAppsForUser(strangerId)
    expect(apps.find((app) => app.id === "photos")?.available).toBe(false)

    await db.delete(schema.user).where(eq(schema.user.id, strangerId))
  })
})
