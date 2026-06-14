import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google"
import Nav from "@components/Nav"
import ContentHeroBackdrop from "@components/ContentHeroBackdrop"
import PageTransition from "@components/PageTransition"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
})

const TITLE = "Vault — your private home for everything"
const DESCRIPTION =
  "Open-source, self-hosted, end-to-end encrypted — files, photos and documents in one private explorer you run yourself."

export const metadata: Metadata = {
  metadataBase: new URL("https://polarhq.app"),
  applicationName: "Vault",
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Vault",
    url: "https://polarhq.app",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
}

export const viewport: Viewport = {
  themeColor: "#3b82f6",
}

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en" className="dark">
    <body
      className={`${geist.variable} ${geistMono.variable} ${serif.variable} bg-background antialiased`}
    >
      <Nav />
      <ContentHeroBackdrop />
      <PageTransition>{children}</PageTransition>
    </body>
  </html>
)

export default RootLayout
