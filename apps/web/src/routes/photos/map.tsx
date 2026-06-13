import { Suspense, lazy } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { t } from "@polarhq/i18n/config"

const PhotoMap = lazy(() => import("@polarhq/interface/screens/Photos/PhotoMap"))

const RouteComponent = () => (
  <div className="flex min-h-0 flex-1 flex-col p-6">
    <Suspense
      fallback={
        <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
          {t("photos:photoMap.loadingMap")}
        </div>
      }
    >
      <PhotoMap />
    </Suspense>
  </div>
)

export const Route = createFileRoute("/photos/map")({ component: RouteComponent })
