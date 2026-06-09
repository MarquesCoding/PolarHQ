import type { ReactNode } from "react"
import Footer from "@components/Footer"

const PageShell = ({
  hero,
  children,
  className = "max-w-3xl",
}: {
  hero?: ReactNode
  children: ReactNode
  className?: string
}) => (
  <main className="relative min-h-svh">
    {hero}
    <div className={`mx-auto px-6 pb-24 ${hero ? "pt-10" : "pt-32"} ${className}`}>{children}</div>
    <Footer />
  </main>
)

export default PageShell
