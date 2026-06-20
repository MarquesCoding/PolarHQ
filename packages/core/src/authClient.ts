import { coreConfig } from "./config"
import { createAuthClient } from "better-auth/react"

/**
 * A placeholder origin is baked into the client; every request rewrites it to the **currently
 * configured** API URL. This lets the auth client follow runtime server changes — the desktop shell
 * lets the user choose their server right on the sign-in page — without re-creating the client or
 * reloading the app. (The web shell configures a fixed same-origin API, so the rewrite is a no-op.)
 */
const PLACEHOLDER_ORIGIN = "http://polar.invalid"

const dynamicFetch = (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
  const apiUrl = coreConfig().apiUrl
  if (input instanceof Request) {
    return fetch(new Request(input.url.replace(PLACEHOLDER_ORIGIN, apiUrl), input))
  }
  return fetch(String(input).replace(PLACEHOLDER_ORIGIN, apiUrl), init)
}

/** better-auth client bound to the Orbit API. Provides signIn/signUp/useSession. */
export const authClient = createAuthClient({
  baseURL: PLACEHOLDER_ORIGIN,
  fetchOptions: { customFetchImpl: dynamicFetch },
})
