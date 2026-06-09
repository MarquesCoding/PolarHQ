import Hero from "@components/Hero"
import AppShowcase from "@components/AppShowcase"
import Showcase from "@components/Showcase"
import Footer from "@components/Footer"

const Page = () => (
  <main className="bg-background min-h-svh">
    <Hero />
    <AppShowcase />
    <Showcase />
    <div
      aria-hidden
      className="via-foreground/20 mx-auto h-px w-full max-w-6xl bg-gradient-to-r from-transparent to-transparent"
    />
    <Footer />
  </main>
)

export default Page
