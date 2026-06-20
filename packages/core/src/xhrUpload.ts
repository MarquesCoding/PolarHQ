import { ApiError } from "./apiClient"

export interface UploadProgress {
  /** Bytes sent so far. */
  loaded: number
  /** Total bytes to send (the encoded request body, ≈ file size). */
  total: number
  /** Average throughput so far, in bytes/second. */
  speed: number
}

export interface UploadOptions {
  /** Called as bytes are sent, for progress / speed / ETA UI. */
  onProgress?: (progress: UploadProgress) => void
  /** Receives the XHR so the caller can abort it. */
  register?: (xhr: XMLHttpRequest) => void
}

/**
 * Retry on transient failures — network errors or 5xx — with exponential backoff, so a flaky
 * connection doesn't kill a long chunked upload. 4xx (quota, bad input) is permanent and rethrown
 * immediately. Re-runs must be idempotent (chunked part uploads are: same part number overwrites).
 */
export const retryOnTransient = async <T>(fn: () => Promise<T>, attempts = 4): Promise<T> => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      const transient = error instanceof ApiError && (error.status === 0 || error.status >= 500)
      if (!transient || attempt >= attempts - 1) throw error
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt))
    }
  }
}

/**
 * POST a FormData with real upload-progress reporting. `fetch` can't expose upload progress, so
 * this uses XHR. On failure it mirrors `apiClient`: it parses the backend's `{ error, errorParams }`
 * body into an `ApiError` (so `apiErrorMessage` resolves a localised reason), tags network failures
 * as `"network"` and user-aborts as `"aborted"`.
 */
export const postFormWithProgress = <T>(
  url: string,
  form: FormData,
  options: UploadOptions = {},
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    options.register?.(xhr)
    const start = performance.now()

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !options.onProgress) return
      const elapsed = (performance.now() - start) / 1000
      options.onProgress({
        loaded: event.loaded,
        total: event.total,
        speed: elapsed > 0 ? event.loaded / elapsed : 0,
      })
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve((xhr.responseText ? JSON.parse(xhr.responseText) : {}) as T)
        } catch {
          reject(new ApiError(xhr.status, "generic"))
        }
        return
      }
      let message = `request.failed`
      let params: Record<string, string | number> | undefined
      try {
        const body = JSON.parse(xhr.responseText) as {
          error?: string
          errorParams?: Record<string, string | number>
        }
        if (body?.error) message = body.error
        if (body?.errorParams) params = body.errorParams
      } catch {
        /* non-JSON error body — keep the generic message */
      }
      reject(new ApiError(xhr.status, message, params))
    }

    xhr.onerror = () => reject(new ApiError(0, "network"))
    xhr.onabort = () => reject(new ApiError(0, "aborted"))

    xhr.open("POST", url)
    xhr.withCredentials = true
    xhr.send(form)
  })
