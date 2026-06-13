import { can, resolveLimit } from "@polarhq/auth"
import { db, schema } from "@polarhq/db"
import { eq } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import * as adminService from "../admin/service"
import { SetupError, completeSetup, getSetupStatus } from "./service"

const ADMIN_EMAIL = "owner@orbit.test"

const cleanupUserByEmail = async (email: string) => {
  const rows = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, email)).limit(1)
  const existing = rows[0]
  if (!existing) return
  await db.delete(schema.subjectRoles).where(eq(schema.subjectRoles.subjectId, existing.id))
  await db.delete(schema.limits).where(eq(schema.limits.subjectId, existing.id))
  await db.delete(schema.user).where(eq(schema.user.id, existing.id))
}

let settingsSnapshot: typeof schema.instanceSettings.$inferSelect | null = null

/** Snapshot real instance settings, then clear them so first-run can be tested. */
const prepareInstance = async () => {
  const rows = await db
    .select()
    .from(schema.instanceSettings)
    .where(eq(schema.instanceSettings.id, "singleton"))
  settingsSnapshot = rows[0] ?? null
  await cleanupUserByEmail(ADMIN_EMAIL)
  await db.delete(schema.instanceSettings).where(eq(schema.instanceSettings.id, "singleton"))
}

/** Remove the test admin and restore the original instance settings. */
const restoreInstance = async () => {
  await cleanupUserByEmail(ADMIN_EMAIL)
  await db.delete(schema.instanceSettings).where(eq(schema.instanceSettings.id, "singleton"))
  if (settingsSnapshot) await db.insert(schema.instanceSettings).values(settingsSnapshot)
}

describe("first-run setup", () => {
  let adminUserId: string

  beforeAll(prepareInstance)
  afterAll(restoreInstance)

  it("reports setup incomplete initially", async () => {
    const status = await getSetupStatus()
    expect(status.setupCompleted).toBe(false)
  })

  it("completes setup and grants the first admin full powers", async () => {
    const result = await completeSetup({
      email: ADMIN_EMAIL,
      password: "Password123!",
      name: "Owner",
      registrationMode: "invite_only",
    })
    adminUserId = result.userId

    expect(await can(adminUserId, "admin.users.manage")).toBe(true)
    expect(await can(adminUserId, "admin.groups.manage")).toBe(true)
    expect(await can(adminUserId, "photos.asset.read")).toBe(true)

    const status = await getSetupStatus()
    expect(status.setupCompleted).toBe(true)
    expect(status.registrationMode).toBe("invite_only")
  })

  it("refuses a second setup", async () => {
    await expect(
      completeSetup({ email: "intruder@orbit.test", password: "Password123!", name: "Nope" }),
    ).rejects.toBeInstanceOf(SetupError)
  })

  it("lets an admin create a group and resolve quota precedence", async () => {
    const group = await adminService.createGroup({ name: `Power Users ${Date.now()}` })

    const memberId = `member-${Date.now()}`
    await db.insert(schema.user).values({
      id: memberId,
      name: "Member",
      email: `${memberId}@orbit.test`,
      emailVerified: true,
    })
    await adminService.addGroupMember(group.id, memberId)

    await adminService.setLimit({
      subjectType: "group",
      subjectId: group.id,
      key: "storage.quota.bytes",
      value: 200_000_000_000,
    })
    expect(await resolveLimit(memberId, "storage.quota.bytes")).toBe(200_000_000_000)

    await adminService.setLimit({
      subjectType: "user",
      subjectId: memberId,
      key: "storage.quota.bytes",
      value: 1_000_000_000_000,
    })
    expect(await resolveLimit(memberId, "storage.quota.bytes")).toBe(1_000_000_000_000)

    await db.delete(schema.limits).where(eq(schema.limits.subjectId, memberId))
    await db.delete(schema.limits).where(eq(schema.limits.subjectId, group.id))
    await db.delete(schema.user).where(eq(schema.user.id, memberId))
    await db.delete(schema.groups).where(eq(schema.groups.id, group.id))
  })
})
