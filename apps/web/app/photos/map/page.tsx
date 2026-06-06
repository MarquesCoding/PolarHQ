"use client"

import dynamic from "next/dynamic"

const PhotoMap = dynamic(() => import("@pages/Photos/PhotoMap"), { ssr: false })

const Page = () => (
  <div className="flex flex-1 flex-col p-6">
    <PhotoMap />
  </div>
)

export default Page
