import { reactConfig } from "@workspace/eslint-config/react"

/**
 * Desktop shell lint config. The shared UI lives in `@workspace/screens` (linted there); this only
 * covers the thin shell sources, so it just extends the base React config.
 *
 * @type {import("eslint").Linter.Config}
 */
export default [...reactConfig]
