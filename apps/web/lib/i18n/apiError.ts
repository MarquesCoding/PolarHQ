"use client"

import { ApiError } from "@lib/apiClient"
import i18n from "./config"

/**
 * Resolve a thrown API error to a localised message. The backend returns a stable error KEY as
 * its `error` field (e.g. "drive.folderLocked" or "forbidden"), which surfaces as ApiError.message;
 * we look it up in the `errors` namespace and fall back to a generic message for anything unknown.
 */
export const apiErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError && error.message) {
    const key = `errors:${error.message}`
    if (i18n.exists(key)) return i18n.t(key, error.params)
  }
  return i18n.t("errors:generic")
}
