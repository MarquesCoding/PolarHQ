"use client"

import i18n from "./config"

/** The active UI locale (BCP-47), for Intl/toLocale* date & number formatting. */
export const dateLocale = (): string => i18n.resolvedLanguage || i18n.language || "en"

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
