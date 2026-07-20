import type { ReactNode } from "react"
import { usePathname, useNavigation } from "@workspace/screens/platform"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { driveFolderIdFromPath, fetchNodes } from "@workspace/core/drive"
import { usePersistentNumber } from "@workspace/screens/persistentSetting"
import { useAppSelector } from "@workspace/screens/store/hooks"
import { useSidebar } from "@workspace/ui/components/sidebar"
import { Button } from "@workspace/ui/components/button"
import { Slider } from "@workspace/ui/components/slider"
import { ArrowLeft, ArrowRight, MagnifyingGlass, SidebarSimple } from "@phosphor-icons/react"
import { cn } from "@workspace/ui/lib/utils"
import ViewToggle from "@components/ViewToggle/ViewToggle"
import Breadcrumbs from "@pages/Drive/components/Breadcrumbs/Breadcrumbs"
import DriveFilterMenu from "@pages/Drive/components/DriveFilterMenu/DriveFilterMenu"
import DriveSortMenu from "@pages/Drive/components/DriveSortMenu/DriveSortMenu"
import DriveTopActions from "@pages/Drive/components/DriveTopActions/DriveTopActions"

/** A floating pill that holds one logical group of controls, matching Spacedrive's toolbar where
 *  each cluster is its own bubble rather than a single continuous bar. */
const Bubble = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div
    className={cn(
      "border-sidebar-border bg-sidebar flex items-center gap-0.5 rounded-full border p-0.5 shadow-sm",
      className,
    )}
  >
    {children}
  </div>
)

/**
 * Spacedrive-style floating top toolbar for Drive — a row of separate bubbles: sidebar toggle,
 * back/forward, the folder breadcrumb, then the view/size/details/create controls.
 */
const DriveTopToolbar = () => {
  const { t } = useTranslation("drive")
  const pathname = usePathname()
  const router = useNavigation()
  const { toggleSidebar } = useSidebar()
  const viewMode = useAppSelector((state) => state.ui.viewMode)
  const detailsOpen = useAppSelector((state) => state.ui.driveDetailsOpen)
  const [tileSize, setTileSize] = usePersistentNumber("drive.tileSize", 150)

  const folderId = driveFolderIdFromPath(pathname)
  const isOverview = pathname === "/drive"
  const isFolderBrowser = folderId !== null
  // DriveTopActions only renders content in a folder or on the trash view; otherwise skip its bubble.
  const showActions = isFolderBrowser || pathname.endsWith("/trash")

  const { data } = useQuery({
    queryKey: ["drive", "nodes", folderId ?? "root"],
    queryFn: () => fetchNodes(folderId ?? undefined),
    enabled: isFolderBrowser,
  })
  const trail = data && "breadcrumb" in data ? data.breadcrumb : []
  const heading = isOverview ? t("driveNav.overview") : null

  return (
    <div
      className="flex items-center gap-2 transition-[padding] duration-200"
      style={{ paddingRight: detailsOpen ? "19.5rem" : undefined }}
    >
      <Bubble>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("breadcrumbs.toggleSidebar")}
          onClick={toggleSidebar}
          className="rounded-full"
        >
          <SidebarSimple className="size-4" />
        </Button>
      </Bubble>

      <Bubble>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("breadcrumbs.back")}
          onClick={() => router.back()}
          className="rounded-full"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("breadcrumbs.forward")}
          onClick={() => router.forward()}
          className="rounded-full"
        >
          <ArrowRight className="size-4" />
        </Button>
      </Bubble>

      {trail.length > 0 || heading ? (
        <Bubble className="min-w-0 px-3 py-1.5">
          {trail.length > 0 ? (
            <Breadcrumbs trail={trail} />
          ) : (
            <span className="text-sm font-medium">{heading}</span>
          )}
        </Bubble>
      ) : null}

      <div className="flex-1" />

      {!isOverview ? (
        <Bubble className="gap-1.5 px-1.5">
          <ViewToggle columns={isFolderBrowser} />
          {viewMode === "grid" ? (
            <div className="flex items-center gap-2 pr-1 pl-0.5">
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
        </Bubble>
      ) : null}

      {!isOverview ? (
        <Bubble>
          <DriveFilterMenu />
          <DriveSortMenu />
        </Bubble>
      ) : null}

      {showActions ? (
        <Bubble>
          <DriveTopActions />
        </Bubble>
      ) : null}
    </div>
  )
}

export default DriveTopToolbar
