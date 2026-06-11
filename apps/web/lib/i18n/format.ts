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

/**
 * Weekday / month names from the catalog (common.dates.*) rather than the browser's Intl, which
 * lacks date data for some locales (e.g. Macedonian returns English). The names are CLDR-sourced
 * (Node full-ICU) at build time, so they're correct in every supported language regardless of the
 * user's browser ICU. Falls back to Intl if the catalog hasn't loaded.
 */
const fromCatalog = (key: string, index: number, fallback: () => string): string => {
  const arr = i18n.t(`common:dates.${key}`, { returnObjects: true }) as unknown
  const name = Array.isArray(arr) ? (arr[index] as string | undefined) : undefined
  return name || fallback()
}

export const weekdayLong = (date: Date): string =>
  fromCatalog("weekdaysLong", date.getDay(), () =>
    date.toLocaleDateString(dateLocale(), { weekday: "long" }),
  )

export const monthLong = (date: Date): string =>
  fromCatalog("monthsLong", date.getMonth(), () =>
    date.toLocaleDateString(dateLocale(), { month: "long" }),
  )

export const monthShort = (date: Date): string =>
  fromCatalog("monthsShort", date.getMonth(), () =>
    date.toLocaleDateString(dateLocale(), { month: "short" }),
  )

/** "15 Jun 2024" using catalog month names (browser-ICU-independent). */
export const formatMediumDate = (value: string | number | Date): string => {
  const d = new Date(value)
  return `${d.getDate()} ${monthShort(d)} ${d.getFullYear()}`
}

/** "15 Jun 2024, 15:30" — catalog date + numeric time (numeric time is safe in every browser). */
export const formatMediumDateTime = (value: string | number | Date): string => {
  const d = new Date(value)
  const time = d.toLocaleTimeString(dateLocale(), { hour: "2-digit", minute: "2-digit" })
  return `${formatMediumDate(d)}, ${time}`
}
