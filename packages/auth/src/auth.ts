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
  trustedOrigins: (request) => {
    // Configured origins, plus the request's own origin when it matches the Host
    // it connected to (same-origin behind the reverse proxy). This lets a
    // self-hosted instance be reached on any address/port without extra config,
    // while still rejecting genuine cross-origin (CSRF) requests.
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
  plugins: [bearer()],
})

export type Auth = typeof auth
