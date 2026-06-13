import { nextJsConfig } from "@polarhq/eslint-config/next-js"

/**
 * Localisation guard: flag new hardcoded user-facing strings so everything keeps going through
 * react-i18next. Scoped to the app's UI (screens/components/app); the design system in
 * packages/ui is intentionally exempt. Warnings, not errors, so symbols just need an allowlist
 * entry rather than blocking the build.
 *
 * @type {import("eslint").Linter.Config}
 */
export default [
  ...nextJsConfig,
  {
    files: ["screens/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
    rules: {
      "react/jsx-no-literals": [
        "warn",
        {
          // Non-translatable glyphs: punctuation, units, number-format samples, keyboard
          // shortcuts (Kbd / DropdownMenuShortcut), and brand/version tokens.
          allowedStrings: [
            "·", "—", "–", "-", "/", "•", "×", "%", "+", "&", "@", "#", ":", "↩", "⌫", "⌘", "K",
            "PolarHQ", "MB", "GB", "KB", "A", "fx", "v", "..", ".0", ".00", "Tab", "Esc",
            "⌘P", "⌘Z", "⌘Y", "⌘X", "⌘C", "⌘V", "⌘A", "⌘B", "⌘I", "⌘U", "⌘K", "⌘S", "⌘F", "⌘O",
            "⇧W", "⇧S", "⇧F", "⇧D", "⇧L", "⇧T", "⇧A", "⇧E",
          ],
        },
      ],
      "no-restricted-syntax": [
        "warn",
        {
          selector: "CallExpression[callee.object.name='toast'] > Literal[value=/[A-Za-z]{2,}/]",
          message: 'User-facing toast text must use a translation key, e.g. toast.error(t("…")).',
        },
        {
          selector: "CallExpression[callee.name='toast'] > Literal[value=/[A-Za-z]{2,}/]",
          message: 'User-facing toast text must use a translation key, e.g. toast(t("…")).',
        },
      ],
    },
  },
]
