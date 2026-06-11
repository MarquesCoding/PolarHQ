"use client"

import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import resourcesToBackend from "i18next-resources-to-backend"
import { initReactI18next } from "react-i18next"

import { FALLBACKS, LOCALE_CODES, NAMESPACES } from "./locales"

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
 * Every user-facing string lives in a namespaced catalog under locales/<lng>/. English is bundled
 * for an instant first paint and as the fallback; the other languages are lazy-loaded per
 * namespace via dynamic import when the user switches, so 20+ locales never bloat the main bundle.
 * The backend returns the same keys (never English prose), resolved via the `errors` namespace.
 */
export const defaultNS = "common"

const enBundle = {
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
}

if (!i18n.isInitialized) {
  void i18n
    .use(
      resourcesToBackend(
        (language: string, namespace: string) => import(`./locales/${language}/${namespace}.json`),
      ),
    )
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: { en: enBundle },
      partialBundledLanguages: true,
      fallbackLng: FALLBACKS,
      supportedLngs: LOCALE_CODES,
      nonExplicitSupportedLngs: true,
      defaultNS,
      ns: NAMESPACES,
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        lookupLocalStorage: "polarhq.lang",
        caches: ["localStorage"],
      },
      // Re-render on "loaded" too, so views update the moment a lazy-loaded catalog arrives
      // (the requested language is set synchronously; its catalog resolves a tick later).
      react: { useSuspense: false, bindI18n: "languageChanged loaded" },
    })
}

/** Standalone translator for non-React contexts (utilities, event handlers outside hooks). */
export const t = i18n.t.bind(i18n)

export default i18n
