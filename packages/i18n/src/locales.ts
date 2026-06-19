/** Every namespace catalog. Keep in sync with the JSON files under locales/<lng>/. */
export const NAMESPACES = [
  "common",
  "errors",
  "photos",
  "drive",
  "docs",
  "sheets",
  "whiteboard",
  "collab",
  "admin",
  "auth",
  "setup",
  "account",
  "onboarding",
] as const

export interface LocaleMeta {
  code: string
  /** Endonym — the language's own name, shown in the picker. */
  label: string
  rtl?: boolean
}

/** Languages the app ships. `en` is the source; the rest are translated catalogs. */
export const LOCALES: LocaleMeta[] = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية", rtl: true },
  { code: "cs", label: "Čeština" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
  { code: "es-MX", label: "Español (México)" },
  { code: "fr", label: "Français" },
  { code: "fr-CA", label: "Français (Canada)" },
  { code: "hi", label: "हिन्दी" },
  { code: "it", label: "Italiano" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "mk", label: "Македонски" },
  { code: "nl", label: "Nederlands" },
  { code: "pl", label: "Polski" },
  { code: "pt", label: "Português" },
  { code: "ru", label: "Русский" },
  { code: "sv", label: "Svenska" },
  { code: "tr", label: "Türkçe" },
  { code: "uk", label: "Українська" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "zh", label: "中文" },
]

export const LOCALE_CODES = LOCALES.map((l) => l.code)

/** Regional variants inherit from their base language, then English. */
export const FALLBACKS: Record<string, string[]> = {
  "es-MX": ["es", "en"],
  "fr-CA": ["fr", "en"],
  default: ["en"],
}

export const isRtl = (code: string): boolean => Boolean(LOCALES.find((l) => l.code === code)?.rtl)
