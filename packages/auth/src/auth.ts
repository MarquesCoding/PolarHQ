import { config } from "@workspace/config"
import { db, schema } from "@workspace/db"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

/**
 * The unified identity service for the whole suite. Email/password is enabled
 * for the MVP; social providers and the OAuth 2.1 provider plugin (for SSO
 * across apps) are layered on in later milestones.
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
})

export type Auth = typeof auth
