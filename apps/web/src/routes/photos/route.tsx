import { Outlet, createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { FlatShell, FlatSidebar } from "@components/FlatShell"
import PhotosNav from "@pages/Photos/components/PhotosNav/PhotosNav"
import PhotosTopBar from "@pages/Photos/components/PhotosTopBar/PhotosTopBar"

const PhotosLayout = () => {
  const { t } = useTranslation("photos")
  return (
    <FlatShell
      sidebar={
        <FlatSidebar productName={t("shell.product")} beta searchPlaceholder={t("shell.search")}>
          <PhotosNav />
        </FlatSidebar>
      }
      topBar={<PhotosTopBar />}
    >
      <Outlet />
    </FlatShell>
  )
}

export const Route = createFileRoute("/photos")({ component: PhotosLayout })
