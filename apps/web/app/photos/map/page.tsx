"use client"

import dynamic from "next/dynamic"

const PhotoMap = dynamic(() => import("@pages/Photos/PhotoMap"), {
  ssr: false,
  loading: () => (
    <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
      Loading map…
    </div>
  ),
})

const Page = () => (
  <div className="flex min-h-0 flex-1 flex-col p-6">
    <PhotoMap />
  </div>
)

export default Page
