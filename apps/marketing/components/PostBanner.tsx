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
    <div className="from-primary to-indigo-600 absolute inset-0 bg-gradient-to-br via-violet-500" />
    <div className="absolute inset-0 [background-image:radial-gradient(circle,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:22px_22px]" />

    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
      <span
        className={`font-display font-bold tracking-tight text-white ${
          compact ? "text-2xl sm:text-3xl" : "text-5xl sm:text-6xl"
        }`}
      >
        PolarHQ
      </span>
      {eyebrow ? (
        <span
          className={`mt-3 font-bold tracking-[0.35em] text-white/70 uppercase ${
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
