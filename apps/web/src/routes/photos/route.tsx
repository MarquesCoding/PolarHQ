import { Outlet, createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { FlatShell, FlatSidebar } from "@polarhq/interface/components/FlatShell"
import DriveNav from "@polarhq/interface/screens/Drive/components/DriveNav/DriveNav"
import PhotosTopBar from "@polarhq/interface/screens/Photos/components/PhotosTopBar/PhotosTopBar"

const PhotosLayout = () => {
  const { t } = useTranslation("drive")
  return (
    <FlatShell
      sidebar={
        <FlatSidebar productName={t("driveNav.drive")} beta searchPlaceholder={t("shell.search")}>
          <DriveNav />
        </FlatSidebar>
      }
      topBar={<PhotosTopBar />}
    >
      <Outlet />
    </FlatShell>
  )
}

export const Route = createFileRoute("/photos")({ component: PhotosLayout })
