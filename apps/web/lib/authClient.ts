import { API_URL } from "@lib/env"
import { createAuthClient } from "better-auth/react"

/** better-auth client bound to the Orbit API. Provides signIn/signUp/useSession. */
export const authClient = createAuthClient({
  baseURL: API_URL,
})
