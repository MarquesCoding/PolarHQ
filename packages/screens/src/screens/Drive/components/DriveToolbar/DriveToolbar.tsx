import { usePathname } from "@workspace/screens/platform"
import ViewToggle from "@components/ViewToggle/ViewToggle"
import { driveFolderIdFromPath } from "@workspace/core/drive"
import { usePersistentNumber } from "@workspace/screens/persistentSetting"
import { useAppSelector } from "@workspace/screens/store/hooks"
import DriveTopActions from "@pages/Drive/components/DriveTopActions/DriveTopActions"
import { Slider } from "@workspace/ui/components/slider"
import { MagnifyingGlass } from "@phosphor-icons/react"

/** Drive browsing controls (floating pill): upload/new-folder + view toggle, plus an inline tile-size
 *  slider in grid mode (matching the Photos chrome). Only shown on file-browsing views, not Overview. */
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
        <div className="flex items-center gap-2 px-1.5">
          <MagnifyingGlass className="text-muted-foreground size-4 shrink-0" />
          <div className="w-24 shrink-0">
            <Slider
              slim
              value={[tileSize]}
              min={100}
              max={280}
              onValueChange={(value) =>
                setTileSize(Array.isArray(value) ? (value[0] ?? tileSize) : value)
              }
            />
          </div>
        </div>
      ) : null}
      <DriveTopActions />
    </div>
  )
}

export default DriveToolbar
