import { config } from "@workspace/config"
import { db, schema } from "@workspace/db"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { bearer } from "better-auth/plugins"
import { and, eq } from "drizzle-orm"

/** Give every new account the built-in "User" role so the app switcher and per-app access work
 *  (permissions are default-deny; without a role a user can't open any app). The first admin also
 *  gets Owner from setup — having both is harmless. */
const assignDefaultRole = async (userId: string): Promise<void> => {
  try {
    const role = (
      await db
        .select()
        .from(schema.roles)
        .where(and(eq(schema.roles.name, "User"), eq(schema.roles.isSystem, true)))
        .limit(1)
    )[0]
    if (!role) return
    await db
      .insert(schema.subjectRoles)
      .values({ subjectType: "user", subjectId: userId, roleId: role.id, scopeType: "global" })
      .onConflictDoNothing()
  } catch (error) {
    console.error("[auth] failed to assign default role:", error)
  }
}

/**
 * The unified identity service for the whole suite. Email/password is enabled
 * for the MVP; social providers and the OAuth 2.1 provider plugin (for SSO
 * across apps) are layered on in later milestones.
 *
 * The `bearer` plugin lets non-browser clients (the native apps) authenticate
 * with `Authorization: Bearer <session-token>` instead of the session cookie.
 * Sessions stay database-backed, so they remain revocable from the admin console
 * — unlike a stateless JWT, which is reserved for cross-service/SSO use later.
 */
export const auth = betterAuth({
  appName: config.appName,
  secret: config.auth.secret,
  baseURL: config.api.url,
  trustedOrigins: (request) => {
    const origins = [...config.web.origins]
    const origin = request?.headers.get("origin")
    const host = request?.headers.get("host")
    if (origin && host) {
      try {
        if (new URL(origin).host === host) origins.push(origin)
      } catch {
        // ignore a malformed Origin header
      }
    }
    return origins
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await assignDefaultRole(user.id)
        },
      },
    },
  },
  plugins: [bearer()],
})

export type Auth = typeof auth
