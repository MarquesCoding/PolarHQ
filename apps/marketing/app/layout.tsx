import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Geist } from "next/font/google"
import "./globals.css"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Orbit — your private home for everything",
  description:
    "Self-hosted, end-to-end encrypted Photos, Drive, Docs and more — one private suite you run yourself.",
}

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en">
    <body className={geist.className}>{children}</body>
  </html>
)

export default RootLayout
