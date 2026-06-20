import { type ReactNode, useEffect } from "react"
import { I18nextProvider } from "react-i18next"
import i18n from "./config"
import { isRtl } from "./locales"

/** Makes the shared i18next instance available to every client component via useTranslation(),
 *  and keeps the document's lang/dir in sync (RTL for Arabic). */
const I18nProvider = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    const apply = (lng: string) => {
      const base = lng.split("-")[0] ?? lng
      document.documentElement.lang = lng
      document.documentElement.dir = isRtl(lng) || isRtl(base) ? "rtl" : "ltr"
    }
    apply(i18n.language || "en")
    i18n.on("languageChanged", apply)
    return () => {
      i18n.off("languageChanged", apply)
    }
  }, [])

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}

export default I18nProvider
