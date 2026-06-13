import { sdkConfig } from "./config"

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

/** Call an Vault API endpoint with cookies, JSON in/out, and typed errors. */
export const apiFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${sdkConfig().apiUrl}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      "content-type": "application/json",
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
