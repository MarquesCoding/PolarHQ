import Hero from "@components/Hero"
import Showcase from "@components/Showcase"
import SplatSection from "@components/SplatSection"
import InstallCommand from "@components/InstallCommand"
import Footer from "@components/Footer"

const Page = () => (
  <main className="bg-background min-h-svh">
    <Hero />
    <Showcase />
    <SplatSection />
    <InstallCommand />
    <div
      aria-hidden
      className="via-foreground/20 mx-auto h-px w-full max-w-6xl bg-gradient-to-r from-transparent to-transparent"
    />
    <Footer />
  </main>
)

export default Page
