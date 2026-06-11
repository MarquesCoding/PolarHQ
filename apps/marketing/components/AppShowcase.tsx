import BrowserFrame from "@components/BrowserFrame"
import PhotosDemo from "@components/PhotosDemo"
import Reveal from "@components/Reveal"

const AppShowcase = () => (
  <section className="relative px-6 py-24 sm:py-32">
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center"
    >
      <div className="size-[680px] max-w-full rounded-full bg-blue-500/10 blur-[140px]" />
    </div>

    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-medium text-blue-400">See it in action</p>
      <h2 className="text-foreground mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
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
