"use client"

import { useTranslation } from "react-i18next"
import { LOCALES } from "@polarhq/i18n/locales"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@polarhq/ui/components/select"

/** Picks the app language and persists it (localStorage via the i18next detector cache). */
const LanguageSelector = () => {
  const { i18n } = useTranslation()
  const current = LOCALES.some((l) => l.code === i18n.resolvedLanguage)
    ? (i18n.resolvedLanguage as string)
    : "en"

  return (
    <Select
      value={current}
      onValueChange={(value) => {
        if (value) void i18n.changeLanguage(value)
      }}
    >
      <SelectTrigger className="w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {LOCALES.map((locale) => (
          <SelectItem key={locale.code} value={locale.code}>
            {locale.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default LanguageSelector
