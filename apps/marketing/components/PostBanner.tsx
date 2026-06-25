interface PostBannerProps {
  eyebrow?: string
  /** Kept for API compatibility — the banner is now a static brand gradient, not a video. */
  live?: boolean
  compact?: boolean
  className?: string
}

const PostBanner = ({ eyebrow, compact = false, className = "" }: PostBannerProps) => (
  <div
    className={`border-primary/20 relative w-full overflow-hidden rounded-2xl border ${
      compact ? "aspect-[16/9]" : "aspect-[16/8]"
    } ${className}`}
  >
    <div className="from-primary/30 to-background absolute inset-0 bg-gradient-to-br via-indigo-500/20" />
    <div className="absolute inset-0 bg-[radial-gradient(60%_85%_at_28%_0%,rgba(124,92,252,0.42),transparent_70%)]" />

    {/* Organising bear peeking in from the bottom-right. */}
    <img
      src="/stickers/bear-organise.png"
      alt=""
      width={140}
      height={140}
      className={`pointer-events-none absolute -bottom-3 right-3 -rotate-12 drop-shadow-[0_14px_28px_rgba(0,0,0,0.4)] ${
        compact ? "w-16" : "w-20 sm:w-28"
      }`}
    />

    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
      <span
        className={`font-display text-foreground font-bold tracking-tight ${
          compact ? "text-2xl sm:text-3xl" : "text-5xl sm:text-6xl"
        }`}
      >
        PolarHQ
      </span>
      {eyebrow ? (
        <span
          className={`text-primary mt-3 font-bold tracking-[0.35em] uppercase ${
            compact ? "text-[9px]" : "text-[11px]"
          }`}
        >
          {eyebrow}
        </span>
      ) : null}
    </div>
  </div>
)

export default PostBanner
