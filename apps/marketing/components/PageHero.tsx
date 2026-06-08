interface PageHeroProps {
  title: string
  subtitle?: string
  eyebrow?: string
}

const PageHero = ({ title, subtitle, eyebrow }: PageHeroProps) => (
  <section className="relative isolate flex min-h-[360px] w-full flex-col items-center justify-center overflow-hidden px-6 pt-28 pb-14 text-center sm:min-h-[420px]">
    {/* Full-bleed hero — same video + scrim language as the home, fading into the page. */}
    <video
      src="/player.mp4"
      poster="/player-poster.jpg"
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      className="absolute inset-0 -z-10 size-full object-cover"
    />
    <div className="from-background/50 via-background/30 to-background absolute inset-0 -z-10 bg-gradient-to-b" />

    <div className="relative max-w-2xl [text-shadow:0_1px_14px_rgba(0,0,0,0.4)]">
      {eyebrow ? (
        <span className="mb-3 block text-[11px] font-medium tracking-[0.35em] text-white/60 uppercase">
          {eyebrow}
        </span>
      ) : null}
      <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">{title}</h1>
      {subtitle ? (
        <p className="mx-auto mt-5 max-w-xl text-base text-white/80 sm:text-lg">{subtitle}</p>
      ) : null}
    </div>
  </section>
)

export default PageHero
