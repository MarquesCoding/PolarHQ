"use client"

import { usePathname } from "@polarhq/interface/lib/router"
import ViewToggle from "@polarhq/interface/components/ViewToggle/ViewToggle"
import { driveFolderIdFromPath } from "@polarhq/vault/drive"
import { usePersistentNumber } from "@polarhq/interface/lib/persistentSetting"
import { useAppSelector } from "@polarhq/interface/store/hooks"
import DriveTopActions from "@polarhq/interface/screens/Drive/components/DriveTopActions/DriveTopActions"
import SizeControl from "@polarhq/interface/screens/Photos/components/SizeControl/SizeControl"

/** Drive title-bar controls: upload/new-folder, view toggle, plus a tile-size slider in grid mode.
 *  The view toggle + size slider only apply to the file-browsing views, not the Overview dashboard. */
const DriveToolbar = () => {
  const pathname = usePathname()
  const viewMode = useAppSelector((state) => state.ui.viewMode)
  const [tileSize, setTileSize] = usePersistentNumber("drive.tileSize", 150)
  const isOverview = pathname === "/drive"
  const isFolderBrowser = driveFolderIdFromPath(pathname) !== null

  return (
    <div className="flex items-center gap-2">
      {!isOverview ? <ViewToggle columns={isFolderBrowser} /> : null}
      {!isOverview && viewMode === "grid" ? (
        <SizeControl value={tileSize} onChange={setTileSize} />
      ) : null}
      <DriveTopActions />
    </div>
  )
}

export default DriveToolbar
