import { AnimatePresence } from "motion/react"
import { useAppSelector } from "@workspace/screens/store/hooks"
import AccountSettings from "@pages/Account/AccountSettings"
import AdminSettings from "@pages/Admin/AdminSettings"

/**
 * App-root mount for the settings modal. Reads the active scope from the ui slice and renders the
 * matching scope (each of which portals a full-screen overlay over the live, dimmed app). Kept above
 * the router so it overlays every route without unmounting the current screen.
 */
const SettingsOverlay = () => {
  const scope = useAppSelector((state) => state.ui.settingsScope)
  return (
    <AnimatePresence>
      {scope === "account" ? <AccountSettings key="account" /> : null}
      {scope === "admin" ? <AdminSettings key="admin" /> : null}
    </AnimatePresence>
  )
}

export default SettingsOverlay
