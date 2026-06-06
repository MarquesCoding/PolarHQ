"use client"

import dynamic from "next/dynamic"

const PhotoMap = dynamic(() => import("@pages/Photos/PhotoMap"), { ssr: false })

const Page = () => (
  <div className="flex min-h-0 flex-1 flex-col p-6">
    <PhotoMap />
  </div>
)

export default Page
