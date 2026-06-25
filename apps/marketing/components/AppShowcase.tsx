import BrowserFrame from "@components/BrowserFrame"
import PhotosDemo from "@components/PhotosDemo"
import Reveal from "@components/Reveal"

const AppShowcase = () => (
  <section className="relative px-6 pt-10 pb-24 sm:pt-16 sm:pb-32">
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center"
    >
      <div className="bg-primary/15 size-[680px] max-w-full rounded-full blur-[140px]" />
    </div>

    <div className="mx-auto max-w-2xl text-center">
      <p className="text-primary text-sm font-semibold tracking-wide">See it in action</p>
      <h2 className="font-display text-foreground mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        Your whole library, in one calm place
      </h2>
      <p className="text-muted-foreground mt-3 text-base">
        Apple-Photos-grade browsing on a server you own — every thumbnail decrypted right in your
        browser.
      </p>
    </div>

    <Reveal className="mx-auto mt-12 max-w-5xl">
      <BrowserFrame url="demo.polarhq.app">
        <PhotosDemo />
      </BrowserFrame>
    </Reveal>
  </section>
)

export default AppShowcase
