import Image from "next/image"

interface PostBannerProps {
  eyebrow?: string
  /** Use the live looping video (post/changelog detail) instead of the still poster (list cards). */
  live?: boolean
  compact?: boolean
  className?: string
}

const PostBanner = ({ eyebrow, live = false, compact = false, className = "" }: PostBannerProps) => (
  <div
    className={`relative w-full overflow-hidden rounded-2xl border border-white/10 ${
      compact ? "aspect-[16/9]" : "aspect-[16/8]"
    } ${className}`}
  >
    {live ? (
      <video
        src="/player.mp4"
        poster="/player-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="absolute inset-0 size-full object-cover"
      />
    ) : (
      <Image
        src="/player-poster.jpg"
        alt=""
        fill
        sizes="(max-width: 1024px) 100vw, 1024px"
        className="object-cover"
      />
    )}

    {/* Same dark scrim language as the home hero. */}
    <div className="from-background/55 via-background/25 to-background/85 absolute inset-0 bg-gradient-to-b" />

    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
      <span
        className={`font-semibold tracking-tight text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.45)] ${
          compact ? "text-2xl sm:text-3xl" : "text-5xl sm:text-6xl"
        }`}
      >
        PolarHQ
      </span>
      {eyebrow ? (
        <span
          className={`mt-3 font-medium tracking-[0.35em] text-white/60 uppercase ${
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
