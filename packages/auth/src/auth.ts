import { config } from "@workspace/config"
import { db, schema } from "@workspace/db"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { bearer } from "better-auth/plugins"

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
  trustedOrigins: [config.web.url],
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
  plugins: [bearer()],
})

export type Auth = typeof auth
