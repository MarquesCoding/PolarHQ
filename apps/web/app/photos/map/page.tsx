"use client"

import dynamic from "next/dynamic"
import { t } from "@lib/i18n/config"

const PhotoMap = dynamic(() => import("@pages/Photos/PhotoMap"), {
  ssr: false,
  loading: () => (
    <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
      {t("photos:photoMap.loadingMap")}
    </div>
  ),
})

const Page = () => (
  <div className="flex min-h-0 flex-1 flex-col p-6">
    <PhotoMap />
  </div>
)

export default Page
