import { sdkConfig } from "./config"
import { createAuthClient } from "better-auth/react"

/** better-auth client bound to the Vault API. Provides signIn/signUp/useSession. */
export const authClient = createAuthClient({
  baseURL: sdkConfig().apiUrl,
})
