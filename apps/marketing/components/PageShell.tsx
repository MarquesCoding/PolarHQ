import type { ReactNode } from "react"
import Nav from "@components/Nav"
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
  <main className="bg-background relative min-h-svh">
    <Nav />
    {hero}
    <div className={`mx-auto px-6 pb-24 ${hero ? "pt-10" : "pt-32"} ${className}`}>{children}</div>
    <Footer />
  </main>
)

export default PageShell
