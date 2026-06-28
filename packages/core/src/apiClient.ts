import { coreConfig } from "./config"
import { getAuthToken } from "./authToken"

export class ApiError extends Error {
  readonly status: number
  /** Optional interpolation values for the error key (the backend sends `errorParams`). */
  readonly params?: Record<string, string | number>

  constructor(status: number, message: string, params?: Record<string, string | number>) {
    super(message)
    this.status = status
    this.params = params
  }
}

/**
 * Extra auth headers to attach to every request. The browser shells authenticate via cookies
 * (`credentials: "include"`), so they leave this unset. React Native has no shared cookie jar, so
 * the mobile shell injects the better-auth session cookie here via {@link configureApiAuth}.
 */
let authHeaders: (() => Record<string, string> | undefined) | null = null

/** Provide auth headers attached to every {@link apiFetch} call (RN shell uses this). */
export const configureApiAuth = (provider: () => Record<string, string> | undefined): void => {
  authHeaders = provider
}

/** Call an Orbit API endpoint with cookies, JSON in/out, and typed errors. */
export const apiFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const token = getAuthToken()
  const response = await fetch(`${coreConfig().apiUrl}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      "content-type": "application/json",
      // Bearer auth for cross-origin shells (desktop) that can't use the SameSite cookie. Unset on
      // the web (same-origin cookie) and overridable by a shell's own headers (RN injects a cookie).
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...authHeaders?.(),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const record = body && typeof body === "object" ? (body as Record<string, unknown>) : null
    const message =
      record && "error" in record ? String(record.error) : `Request failed (${response.status})`
    const params =
      record && record.errorParams && typeof record.errorParams === "object"
        ? (record.errorParams as Record<string, string | number>)
        : undefined
    throw new ApiError(response.status, message, params)
  }

  return response.json() as Promise<T>
}
