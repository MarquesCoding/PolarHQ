import { type ReactNode, useEffect, useState } from "react"
import { Icon } from "@workspace/screens/icons"
import type { GridAsset } from "@workspace/core/photos"
import PhotoTile from "@pages/Photos/components/PhotoTile/PhotoTile"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import NumberFlow from "@number-flow/react"
import { AnimatePresence, motion } from "motion/react"
import { useTranslation } from "react-i18next"

const STORAGE_KEY = "polarhq.onboarded.v1"
const LOOP = 4.2

/** Clear the "seen" flag and reload so the intro shows again (wired to "Replay intro"). */
export const replayOnboarding = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  window.location.reload()
}

const sample = (id: string, thumb: string, extra: Partial<GridAsset> = {}): GridAsset => ({
  id,
  originalFilename: id,
  encrypted: false,
  encryptedName: null,
  mimeType: "image/jpeg",
  type: "image",
  status: "ready",
  sizeBytes: 0,
  width: 120,
  height: 120,
  durationMs: null,
  takenAt: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  isFavorite: false,
  thumbnailUrl: thumb,
  previewUrl: thumb,
  videoUrl: null,
  motion: false,
  splat: false,
  stackId: null,
  stackCount: 1,
  ...extra,
})

const noop = () => {}

const Tile = ({ asset, delay }: { asset: GridAsset; delay: number }) => (
  <div className="aspect-square">
    <PhotoTile
      asset={asset}
      selected={false}
      selectionActive={false}
      animateIn
      delay={delay}
      onOpen={noop}
      onToggle={noop}
    />
  </div>
)

const cursorPath = "M5.4 3 5.4 17.6 9.1 13.9 11.8 19.4 13.9 18.4 11.2 13 16.1 13 Z"

/** A fake pointer that glides to `target` and taps, looping forever. */
const DemoCursor = ({ from, to, tapAt }: {
  from: [number, number]
  to: [number, number]
  tapAt: number
}) => (
  <motion.svg
    viewBox="0 0 24 24"
    className="pointer-events-none absolute top-0 left-0 z-30 size-[18px] drop-shadow-md"
    initial={{ x: from[0], y: from[1] }}
    animate={{ x: [from[0], to[0], to[0]], y: [from[1], to[1], to[1]], scale: [1, 1, 0.82, 1, 1] }}
    transition={{
      x: { duration: LOOP, times: [0, tapAt, 1], repeat: Infinity, ease: "easeInOut" },
      y: { duration: LOOP, times: [0, tapAt, 1], repeat: Infinity, ease: "easeInOut" },
      scale: {
        duration: LOOP,
        times: [0, tapAt - 0.02, tapAt + 0.02, tapAt + 0.06, 1],
        repeat: Infinity,
      },
    }}
  >
    <path d={cursorPath} fill="white" stroke="black" strokeWidth="1.3" strokeLinejoin="round" />
  </motion.svg>
)

/** A ripple where the cursor taps. */
const Tap = ({ at, tapAt }: { at: [number, number]; tapAt: number }) => (
  <motion.span
    className="border-primary pointer-events-none absolute z-20 -ml-3 -mt-3 size-6 rounded-full border-2"
    style={{ left: at[0], top: at[1] }}
    animate={{ scale: [0, 0, 1.5, 1.5], opacity: [0, 0, 0.8, 0] }}
    transition={{
      duration: LOOP,
      times: [0, tapAt, tapAt + 0.08, tapAt + 0.3],
      repeat: Infinity,
      ease: "easeOut",
    }}
  />
)

/** Drop photos in — they pop into the grid and a burst collapses into one stack. */
const UploadDemo = () => {
  const tiles = [
    sample("onb-u1", "/onboarding/1.jpg"),
    sample("onb-u2", "/onboarding/2.jpg", { stackId: "s", stackCount: 4 }),
    sample("onb-u3", "/onboarding/3.jpg"),
    sample("onb-u4", "/onboarding/4.jpg", { isFavorite: true }),
    sample("onb-u5", "/onboarding/5.jpg"),
    sample("onb-u6", "/onboarding/6.jpg"),
  ]
  return (
    <div className="relative h-full w-full">
      <div className="mx-auto grid w-[148px] grid-cols-3 gap-1.5">
        {tiles.map((asset, i) => (
          <Tile key={asset.id} asset={asset} delay={i * 0.12} />
        ))}
      </div>
      <Tap at={[150, 30]} tapAt={0.5} />
      <DemoCursor from={[240, 96]} to={[150, 30]} tapAt={0.5} />
    </div>
  )
}

/** Make an album, then share a private link. */
const ShareDemo = () => {
  const { t } = useTranslation("onboarding")
  return (
  <div className="relative flex h-full w-full items-center justify-center gap-3">
    <div className="flex items-center gap-2.5">
      <div className="ring-border size-[60px] overflow-hidden rounded-lg ring-1">
        <img src="/onboarding/4.jpg" alt="" className="size-full object-cover" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-foreground text-xs font-semibold">{t("onboardingCard.albumName")}</span>
        <span className="text-muted-foreground text-[11px]">{t("onboardingCard.albumItems")}</span>
        <Button size="xs" className="mt-1 w-fit">
          <Icon name="open-external" className="size-3" />
          {t("onboardingCard.share")}
        </Button>
      </div>
    </div>
    <motion.div
      className="bg-primary/15 text-primary absolute right-2 bottom-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
      animate={{ opacity: [0, 0, 1, 1, 0], y: [4, 4, 0, 0, 0] }}
      transition={{ duration: LOOP, times: [0, 0.52, 0.6, 0.9, 1], repeat: Infinity }}
    >
      <Icon name="circle-check" className="size-2.5" />
      {t("onboardingCard.linkCopied")}
    </motion.div>
    <Tap at={[150, 70]} tapAt={0.5} />
    <DemoCursor from={[60, 96]} to={[150, 70]} tapAt={0.5} />
  </div>
  )
}

/** Everything is end-to-end encrypted — a lock closes over the library. */
const PrivacyDemo = () => {
  const tiles = [
    sample("onb-p1", "/onboarding/1.jpg"),
    sample("onb-p2", "/onboarding/2.jpg"),
    sample("onb-p3", "/onboarding/3.jpg"),
  ]
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <motion.div
        className="flex gap-2"
        animate={{ filter: ["blur(0px)", "blur(0px)", "blur(3px)"], opacity: [1, 1, 0.5] }}
        transition={{ duration: LOOP, times: [0, 0.3, 0.55], repeat: Infinity, ease: "easeInOut" }}
      >
        {tiles.map((asset) => (
          <div key={asset.id} className="size-16">
            <PhotoTile
              asset={asset}
              selected={false}
              selectionActive={false}
              onOpen={noop}
              onToggle={noop}
            />
          </div>
        ))}
      </motion.div>
      <motion.div
        className="bg-background/90 ring-border text-emerald-500 absolute flex size-12 items-center justify-center rounded-2xl ring-1 backdrop-blur-sm"
        animate={{ scale: [0.4, 0.4, 1], opacity: [0, 0, 1] }}
        transition={{ duration: LOOP, times: [0, 0.35, 0.6], repeat: Infinity, ease: "easeOut" }}
      >
        <Icon name="shield-lock" className="size-6" />
      </motion.div>
    </div>
  )
}

interface Slide {
  icon: string
  accent: string
  title: string
  body: string
  Demo: () => ReactNode
}

/** First-run suite intro: a dismissible card that demos key flows with the real UI. */
const OnboardingCard = () => {
  const { t } = useTranslation("onboarding")
  const SLIDES: Slide[] = [
    {
      icon: "shield-lock",
      accent: "from-emerald-500/15 to-emerald-500/5",
      title: t("onboardingCard.privateTitle"),
      body: t("onboardingCard.privateBody"),
      Demo: PrivacyDemo,
    },
    {
      icon: "photo",
      accent: "from-primary/15 to-primary/5",
      title: t("onboardingCard.uploadTitle"),
      body: t("onboardingCard.uploadBody"),
      Demo: UploadDemo,
    },
    {
      icon: "albums",
      accent: "from-violet-500/15 to-violet-500/5",
      title: t("onboardingCard.albumsTitle"),
      body: t("onboardingCard.albumsBody"),
      Demo: ShareDemo,
    },
  ]
  const [visible, setVisible] = useState(false)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch {
      /* private mode — just don't show it */
    }
  }, [])

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1")
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  const slide = SLIDES[index]!
  const last = index === SLIDES.length - 1

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="onboarding"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50"
        >
          <button
            type="button"
            aria-label={t("onboardingCard.dismiss")}
            onClick={dismiss}
            className="bg-background/70 absolute inset-0 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="panel absolute right-4 bottom-4 w-[340px] overflow-hidden rounded-2xl shadow-2xl select-none"
          >
            <div className="px-5 pt-5">
              <div className="ring-border bg-muted/30 h-32 overflow-hidden rounded-xl ring-1 ring-inset">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2 }}
                    className="h-full p-3"
                  >
                    <slide.Demo />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="px-5 pt-4 pb-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <p className="text-foreground text-sm font-semibold">{slide.title}</p>
                  <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">{slide.body}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="border-border/60 flex items-center justify-between border-t px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  {SLIDES.map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        i === index ? "bg-primary w-4" : "bg-muted-foreground/30 w-1.5",
                      )}
                    />
                  ))}
                </div>
                <NumberFlow
                  value={index + 1}
                  suffix={`/${SLIDES.length}`}
                  className="text-muted-foreground text-xs tabular-nums"
                />
              </div>
              <div className="flex items-center gap-1">
                {index > 0 ? (
                  <Button variant="ghost" size="sm" onClick={() => setIndex((i) => i - 1)}>
                    {t("onboardingCard.back")}
                  </Button>
                ) : null}
                {last ? (
                  <Button size="sm" onClick={dismiss}>
                    {t("onboardingCard.getStarted")}
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setIndex((i) => i + 1)}>
                    {t("onboardingCard.next")}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default OnboardingCard
