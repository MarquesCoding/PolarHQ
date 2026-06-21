/**
 * Build-time client config for the desktop shell. Unlike the web shell, the **server URL is not
 * here** — the desktop binary connects to a user's self-hosted server, so the address is chosen at
 * runtime (see `lib/server.ts`) and fed to core by the bootstrap gate.
 */
import { RELEASES } from "@workspace/changelog"

export const APP_NAME = import.meta.env.VITE_APP_NAME ?? "PolarHQ"

/** App version + build identifier shown in the sidebar footer. Defaults to the latest changelog
 *  release (the single source of truth) so it's correct even without a build-time `VITE_APP_VERSION`. */
export const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? RELEASES[0]?.version ?? "0.0.1"
export const APP_BUILD = import.meta.env.VITE_APP_BUILD ?? "desktop"
