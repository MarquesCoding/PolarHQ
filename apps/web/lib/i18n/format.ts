"use client"

import i18n from "./config"

/**
 * The active UI locale (BCP-47) for Intl/toLocale* formatting. Prefer the explicitly selected
 * `language` — `resolvedLanguage` can collapse to a fallback (e.g. a base language or "en") while
 * the user has clearly chosen another, which would silently mis-format dates.
 */
export const dateLocale = (): string => i18n.language || i18n.resolvedLanguage || "en"

/** Format a date in the active UI locale. */
export const formatDate = (
  value: string | number | Date,
  options?: Intl.DateTimeFormatOptions,
): string => new Date(value).toLocaleDateString(dateLocale(), options)

/** Format a time in the active UI locale. */
export const formatTime = (
  value: string | number | Date,
  options?: Intl.DateTimeFormatOptions,
): string => new Date(value).toLocaleTimeString(dateLocale(), options)

/** Format a date+time in the active UI locale. */
export const formatDateTime = (
  value: string | number | Date,
  options?: Intl.DateTimeFormatOptions,
): string => new Date(value).toLocaleString(dateLocale(), options)
