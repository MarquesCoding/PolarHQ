"use client"

import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"

import account from "./locales/en/account.json"
import admin from "./locales/en/admin.json"
import auth from "./locales/en/auth.json"
import collab from "./locales/en/collab.json"
import common from "./locales/en/common.json"
import docs from "./locales/en/docs.json"
import drive from "./locales/en/drive.json"
import errors from "./locales/en/errors.json"
import onboarding from "./locales/en/onboarding.json"
import photos from "./locales/en/photos.json"
import setup from "./locales/en/setup.json"
import sheets from "./locales/en/sheets.json"
import whiteboard from "./locales/en/whiteboard.json"

/**
 * Every user-facing string lives in a namespaced catalog under locales/<lng>/. Components call
 * `useTranslation("<namespace>")` and reference keys; the backend returns the same keys (never
 * English prose) which the client resolves via the `errors` namespace. Add new locales by
 * dropping a sibling folder and registering it in `resources`.
 */
export const resources = {
  en: {
    common,
    errors,
    photos,
    drive,
    docs,
    sheets,
    whiteboard,
    collab,
    admin,
    auth,
    setup,
    account,
    onboarding,
  },
} as const

export const defaultNS = "common"
export const namespaces = Object.keys(resources.en)

if (!i18n.isInitialized) {
  void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: "en",
      supportedLngs: ["en"],
      defaultNS,
      ns: namespaces,
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        lookupLocalStorage: "polarhq.lang",
        caches: ["localStorage"],
      },
      react: { useSuspense: false },
    })
}

/** Standalone translator for non-React contexts (utilities, event handlers outside hooks). */
export const t = i18n.t.bind(i18n)

export default i18n
