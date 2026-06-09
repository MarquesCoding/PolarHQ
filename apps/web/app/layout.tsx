import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Geist, Geist_Mono } from "next/font/google"

import "@workspace/ui/globals.css"
import Providers from "@components/Providers/Providers"
import { APP_NAME } from "@lib/env"
import { cn } from "@workspace/ui/lib/utils"

const fontSans = Geist({ subsets: ["latin"], variable: "--font-sans" })
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: APP_NAME,
  description: `${APP_NAME} — your self-hosted apps, all in one place`,
}

const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", fontSans.variable)}
    >
      <body>
        <Providers>{children}</Providers>
        <div id="portal" style={{ position: "fixed", left: 0, top: 0, zIndex: 9999 }} />
      </body>
    </html>
  )
}

export default RootLayout
