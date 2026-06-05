"use client"

import ViewToggle from "@components/ViewToggle/ViewToggle"
import { usePersistentNumber } from "@lib/persistentSetting"
import { useAppSelector } from "@store/hooks"
import DriveTopActions from "@pages/Drive/components/DriveTopActions/DriveTopActions"
import SizeControl from "@pages/Photos/components/SizeControl/SizeControl"

/** Drive title-bar controls: upload/new-folder, view toggle, plus a tile-size slider in grid mode. */
const DriveToolbar = () => {
  const viewMode = useAppSelector((state) => state.ui.viewMode)
  const [tileSize, setTileSize] = usePersistentNumber("drive.tileSize", 150)

  return (
    <div className="flex items-center gap-2">
      <ViewToggle />
      {viewMode === "grid" ? <SizeControl value={tileSize} onChange={setTileSize} /> : null}
      <DriveTopActions />
    </div>
  )
}

export default DriveToolbar
