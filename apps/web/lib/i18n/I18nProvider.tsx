"use client"

import type { ReactNode } from "react"
import { I18nextProvider } from "react-i18next"
import i18n from "./config"

/** Makes the shared i18next instance available to every client component via useTranslation(). */
const I18nProvider = ({ children }: { children: ReactNode }) => (
  <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
)

export default I18nProvider
