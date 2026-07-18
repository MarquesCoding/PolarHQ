import { coreConfig } from "./config"
import { getAuthToken, setAuthToken } from "./authToken"
import { createAuthClient } from "better-auth/react"

/**
 * A placeholder origin is baked into the client; every request rewrites it to the **currently
 * configured** API URL. This lets the auth client follow runtime server changes — the desktop shell
 * lets the user choose their server right on the sign-in page — without re-creating the client or
 * reloading the app. (The web shell configures a fixed same-origin API, so the rewrite is a no-op.)
 */
const PLACEHOLDER_ORIGIN = "http://polar.invalid"

const dynamicFetch = async (
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> => {
  const apiUrl = coreConfig().apiUrl
  const token = getAuthToken()
  let response: Response
  if (input instanceof Request) {
    const request = new Request(input.url.replace(PLACEHOLDER_ORIGIN, apiUrl), input)
    if (token && !request.headers.has("authorization")) {
      request.headers.set("authorization", `Bearer ${token}`)
    }
    response = await fetch(request)
  } else {
    const headers = new Headers(init?.headers)
    if (token && !headers.has("authorization")) headers.set("authorization", `Bearer ${token}`)
    response = await fetch(String(input).replace(PLACEHOLDER_ORIGIN, apiUrl), { ...init, headers })
  }
  const issued = response.headers.get("set-auth-token")
  if (issued) setAuthToken(issued)
  return response
}

/** better-auth client bound to the Orbit API. Provides signIn/signUp/useSession. */
export const authClient = createAuthClient({
  baseURL: PLACEHOLDER_ORIGIN,
  fetchOptions: { customFetchImpl: dynamicFetch },
})
