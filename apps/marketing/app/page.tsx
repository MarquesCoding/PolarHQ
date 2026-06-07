import Nav from "@components/Nav"
import ParallaxHero from "@components/ParallaxHero"
import ServicesFlow from "@components/ServicesFlow"
import Features from "@components/Features"
import Pricing from "@components/Pricing"
import FAQ from "@components/FAQ"
import Setup from "@components/Setup"
import Footer from "@components/Footer"

const Page = () => (
  <main className="bg-background min-h-svh">
    <Nav />
    <ParallaxHero />
    <ServicesFlow />
    <Features />
    <Setup />
    <Pricing />
    <FAQ />
    <Footer />
  </main>
)

export default Page
