import { usePathname, useNavigation } from "@workspace/screens/platform"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { driveFolderIdFromPath, fetchNodes } from "@workspace/core/drive"
import { usePersistentNumber } from "@workspace/screens/persistentSetting"
import { useAppSelector } from "@workspace/screens/store/hooks"
import { Button } from "@workspace/ui/components/button"
import { Slider } from "@workspace/ui/components/slider"
import { ArrowLeft, MagnifyingGlass } from "@phosphor-icons/react"
import ViewToggle from "@components/ViewToggle/ViewToggle"
import Breadcrumbs from "@pages/Drive/components/Breadcrumbs/Breadcrumbs"
import DriveTopActions from "@pages/Drive/components/DriveTopActions/DriveTopActions"

/**
 * Spacedrive-style floating top toolbar for Drive: back navigation + the folder breadcrumb on the
 * left, and the view/size/details/create controls on the right. Replaces the old bottom-right pill.
 */
const DriveTopToolbar = () => {
  const { t } = useTranslation("drive")
  const pathname = usePathname()
  const router = useNavigation()
  const viewMode = useAppSelector((state) => state.ui.viewMode)
  const [tileSize, setTileSize] = usePersistentNumber("drive.tileSize", 150)

  const folderId = driveFolderIdFromPath(pathname)
  const isOverview = pathname === "/drive"
  const isFolderBrowser = folderId !== null

  const { data } = useQuery({
    queryKey: ["drive", "nodes", folderId ?? "root"],
    queryFn: () => fetchNodes(folderId ?? undefined),
    enabled: isFolderBrowser,
  })
  const trail = data && "breadcrumb" in data ? data.breadcrumb : []

  const heading = isOverview ? t("driveNav.overview") : null

  return (
    <div className="bg-background/70 flex h-11 items-center gap-1 rounded-2xl border pr-1.5 pl-1 shadow-lg backdrop-blur-xl">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("breadcrumbs.back", { defaultValue: "Back" })}
        onClick={() => router.back()}
        className="rounded-xl"
      >
        <ArrowLeft className="size-4" />
      </Button>

      <div className="flex min-w-0 flex-1 items-center pl-1">
        {trail.length > 0 ? (
          <Breadcrumbs trail={trail} />
        ) : heading ? (
          <span className="text-sm font-medium">{heading}</span>
        ) : null}
      </div>

      {!isOverview ? <ViewToggle columns={isFolderBrowser} /> : null}

      {!isOverview && viewMode === "grid" ? (
        <div className="flex items-center gap-2 px-2">
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

export default DriveTopToolbar
