import { usePathname } from "@workspace/screens/platform"
import ViewToggle from "@components/ViewToggle/ViewToggle"
import { driveFolderIdFromPath } from "@workspace/core/drive"
import { usePersistentNumber } from "@lib/persistentSetting"
import { useAppSelector } from "@workspace/screens/store/hooks"
import DriveTopActions from "@pages/Drive/components/DriveTopActions/DriveTopActions"
import SizeControl from "@pages/Photos/components/SizeControl/SizeControl"

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
