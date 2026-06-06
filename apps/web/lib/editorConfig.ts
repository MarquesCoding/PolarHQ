/** Shared TipTap link hardening — only safe URL schemes are permitted in any editor. */

const SAFE_PROTOCOLS = ["http", "https", "mailto", "tel"]
const ALLOWED = ["http:", "https:", "mailto:", "tel:"]

/** StarterKit `link` options: no auto-open, and only safe protocols (blocks javascript:, data:, …). */
export const safeLinkOptions = {
  openOnClick: false,
  protocols: SAFE_PROTOCOLS,
}

/**
 * Normalize + validate a user-entered link, returning a safe href or null. Bare
 * domains get https://; anything outside the allowed schemes is rejected.
 */
export const sanitizeLinkHref = (input: string): string | null => {
  let href = input.trim()
  if (!href) return null
  if (!/^[a-z][a-z0-9+.-]*:/i.test(href)) href = `https://${href}`
  try {
    return ALLOWED.includes(new URL(href).protocol) ? href : null
  } catch {
    return null
  }
}
