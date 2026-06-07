import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "Orbit — your private home for everything",
  description:
    "Open-source, self-hosted, end-to-end encrypted Photos, Drive and Docs — one private suite you run yourself.",
}

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en" className="dark">
    <body className={`${geist.variable} ${geistMono.variable} ${geist.className} antialiased`}>
      {children}
    </body>
  </html>
)

export default RootLayout
