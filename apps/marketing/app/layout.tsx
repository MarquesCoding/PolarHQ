import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
})

export const metadata: Metadata = {
  title: "PolarHQ — your private home for everything",
  description:
    "Open-source, self-hosted, end-to-end encrypted Photos, Drive and Docs — one private suite you run yourself.",
}

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en" className="dark">
    <body className={`${geist.variable} ${geistMono.variable} ${serif.variable} antialiased`}>
      {children}
    </body>
  </html>
)

export default RootLayout
