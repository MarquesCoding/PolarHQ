import { auth } from "@polarhq/auth"
import { db, schema } from "@polarhq/db"
import { eq } from "drizzle-orm"
import { getRoleByName, seedSystemRoles } from "../admin/roles"
import { getInstanceSettings, updateInstanceSettings } from "../instance"

export class SetupError extends Error {}

export type RegistrationMode = "invite_only" | "open" | "closed"

export interface SetupStatus {
  setupCompleted: boolean
  registrationMode: RegistrationMode
}

export const getSetupStatus = async (): Promise<SetupStatus> => {
  const settings = await getInstanceSettings()
  return {
    setupCompleted: settings.setupCompleted,
    registrationMode: settings.registrationMode,
  }
}

export interface CompleteSetupInput {
  email: string
  password: string
  name: string
  registrationMode?: RegistrationMode
}

export interface CompleteSetupResult {
  userId: string
}

/**
 * First-run setup: create the first admin (the Owner), seed system roles, and
 * mark the instance configured. Refuses to run once setup is complete.
 */
export const completeSetup = async (input: CompleteSetupInput): Promise<CompleteSetupResult> => {
  const settings = await getInstanceSettings()
  if (settings.setupCompleted) throw new SetupError("setup.alreadyComplete")

  await seedSystemRoles()

  const signUp = await auth.api.signUpEmail({
    body: { email: input.email, password: input.password, name: input.name },
  })
  const userId = signUp.user.id

  await db
    .update(schema.user)
    .set({ role: "admin", emailVerified: true })
    .where(eq(schema.user.id, userId))

  const owner = await getRoleByName("Owner")
  if (!owner) throw new Error("Owner role missing after seeding")

  await db.insert(schema.subjectRoles).values({
    subjectType: "user",
    subjectId: userId,
    roleId: owner.id,
    scopeType: "global",
  })

  await updateInstanceSettings({
    setupCompleted: true,
    registrationMode: input.registrationMode ?? "invite_only",
  })

  return { userId }
}
