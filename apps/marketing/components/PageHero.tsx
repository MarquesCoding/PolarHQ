interface PageHeroProps {
  title: string
  subtitle?: string
  eyebrow?: string
}

const PageHero = ({ title, subtitle, eyebrow }: PageHeroProps) => (
  <section className="relative flex min-h-[360px] w-full flex-col items-center justify-center overflow-hidden px-6 pt-28 pb-14 text-center sm:min-h-[420px]">
    <img
      src="/stickers/bear-read.png"
      alt=""
      width={220}
      height={220}
      className="pointer-events-none absolute -right-8 -bottom-8 w-28 -rotate-12 drop-shadow-[0_16px_32px_rgba(0,0,0,0.3)] sm:right-2 sm:w-40"
    />
    <div className="relative max-w-2xl">
      {eyebrow ? (
        <span className="text-primary mb-3 block text-[11px] font-bold tracking-[0.35em] uppercase">
          {eyebrow}
        </span>
      ) : null}
      <h1 className="font-display text-foreground text-4xl font-bold tracking-tight sm:text-6xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="text-foreground/75 mx-auto mt-5 max-w-xl text-base sm:text-lg">{subtitle}</p>
      ) : null}
    </div>
  </section>
)

export default PageHero
