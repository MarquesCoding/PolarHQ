"use client"

import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react"
import { Icon } from "@polarhq/interface/lib/icons"
import { cn } from "@polarhq/ui/lib/utils"
import { AnimatePresence, motion } from "motion/react"
import { useTranslation } from "react-i18next"

const clamp = (value: number, low: number, high: number): number =>
  Math.max(low, Math.min(high, value))

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60)
  return `${minutes}:${String(rest).padStart(2, "0")}`
}

const Scrubber = ({
  value,
  onScrub,
  className,
}: {
  value: number
  onScrub: (fraction: number) => void
  className?: string
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const setFrom = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect()
    if (rect) onScrub(clamp((clientX - rect.left) / rect.width, 0, 1))
  }
  return (
    <div
      ref={ref}
      className={cn("group bg-foreground/20 relative h-1.5 cursor-pointer rounded-full", className)}
      onPointerDown={(event) => {
        setDragging(true)
        ref.current?.setPointerCapture(event.pointerId)
        setFrom(event.clientX)
      }}
      onPointerMove={(event) => {
        if (dragging) setFrom(event.clientX)
      }}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
    >
      <div
        className="bg-primary absolute inset-y-0 left-0 rounded-full"
        style={{ width: `${value * 100}%` }}
      />
      <div
        className={cn(
          "bg-primary absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full shadow transition-opacity",
          dragging ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
        style={{ left: `${value * 100}%` }}
      />
    </div>
  )
}

interface MediaPlayerProps {
  kind: "video" | "audio"
  src: string
  poster?: string
  name?: string
}

const MediaPlayer = ({ kind, src, poster, name }: MediaPlayerProps) => {
  const { t } = useTranslation("photos")
  const mediaRef = useRef<HTMLVideoElement & HTMLAudioElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [controlsShown, setControlsShown] = useState(true)

  useEffect(() => {
    const el = mediaRef.current
    if (!el) return
    const onTime = () => setCurrent(el.currentTime)
    const onMeta = () => setDuration(el.duration || 0)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onVolume = () => {
      setVolume(el.volume)
      setMuted(el.muted)
    }
    el.addEventListener("timeupdate", onTime)
    el.addEventListener("loadedmetadata", onMeta)
    el.addEventListener("durationchange", onMeta)
    el.addEventListener("play", onPlay)
    el.addEventListener("pause", onPause)
    el.addEventListener("volumechange", onVolume)
    return () => {
      el.removeEventListener("timeupdate", onTime)
      el.removeEventListener("loadedmetadata", onMeta)
      el.removeEventListener("durationchange", onMeta)
      el.removeEventListener("play", onPlay)
      el.removeEventListener("pause", onPause)
      el.removeEventListener("volumechange", onVolume)
    }
  }, [])

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener("fullscreenchange", onFs)
    return () => document.removeEventListener("fullscreenchange", onFs)
  }, [])

  const togglePlay = () => {
    const el = mediaRef.current
    if (!el) return
    if (el.paused) void el.play()
    else el.pause()
  }
  const seek = (fraction: number) => {
    const el = mediaRef.current
    if (el && duration) el.currentTime = fraction * duration
  }
  const toggleMute = () => {
    const el = mediaRef.current
    if (!el) return
    el.muted = !el.muted
  }
  const changeVolume = (next: number) => {
    const el = mediaRef.current
    if (!el) return
    el.volume = next
    el.muted = next === 0
  }
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void containerRef.current?.requestFullscreen()
  }

  const revealControls = () => {
    setControlsShown(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    if (kind === "video" && playing) {
      hideTimer.current = window.setTimeout(() => setControlsShown(false), 2500)
    }
  }

  const progress = duration ? current / duration : 0

  const controlBar = (
    <div
      className="panel flex items-center gap-2 rounded-full px-2.5 py-1.5 shadow-lg"
      onPointerDown={(event: ReactPointerEvent) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-label={playing ? t("mediaPlayer.pause") : t("mediaPlayer.play")}
        onClick={togglePlay}
        className="hover:bg-muted flex size-8 shrink-0 items-center justify-center rounded-full transition"
      >
        <Icon name={playing ? "media-pause" : "media-play"} className="size-5" />
      </button>
      <span className="text-muted-foreground w-9 shrink-0 text-center text-xs tabular-nums">
        {formatTime(current)}
      </span>
      <Scrubber value={progress} onScrub={seek} className={kind === "audio" ? "w-40" : "w-48"} />
      <span className="text-muted-foreground w-9 shrink-0 text-center text-xs tabular-nums">
        {formatTime(duration)}
      </span>
      <div className="group flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          aria-label={muted ? t("mediaPlayer.unmute") : t("mediaPlayer.mute")}
          onClick={toggleMute}
          className="hover:bg-muted flex size-8 items-center justify-center rounded-full transition"
        >
          <Icon name={muted || volume === 0 ? "volume-mute" : "volume"} className="size-5" />
        </button>
        <Scrubber
          value={muted ? 0 : volume}
          onScrub={changeVolume}
          className="w-0 opacity-0 transition-all group-hover:w-16 group-hover:opacity-100"
        />
      </div>
      {kind === "video" ? (
        <button
          type="button"
          aria-label={t("mediaPlayer.fullscreen")}
          onClick={toggleFullscreen}
          className="hover:bg-muted flex size-8 shrink-0 items-center justify-center rounded-full transition"
        >
          <Icon name="fullscreen" className="size-5" />
        </button>
      ) : null}
    </div>
  )

  if (kind === "audio") {
    return (
      <div className="panel flex w-[26rem] max-w-full flex-col items-center gap-5 rounded-2xl px-6 py-7">
        <Icon name="music" className="text-muted-foreground size-16" />
        {name ? <p className="max-w-full truncate text-sm font-medium">{name}</p> : null}
        {controlBar}
        <audio ref={mediaRef} src={src} autoPlay />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex items-center justify-center",
        fullscreen ? "h-full w-full bg-black" : "max-h-full max-w-full",
      )}
      onMouseMove={revealControls}
      onMouseLeave={() => {
        if (playing) setControlsShown(false)
      }}
    >
      <video
        ref={mediaRef}
        src={src}
        poster={poster}
        autoPlay
        playsInline
        onClick={togglePlay}
        className={cn(
          "rounded-2xl shadow-2xl",
          fullscreen ? "max-h-full max-w-full" : "max-h-full max-w-full",
        )}
      />
      <AnimatePresence>
        {controlsShown ? (
          <motion.div
            key="controls"
            className="absolute bottom-3 left-1/2 -translate-x-1/2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
          >
            {controlBar}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default MediaPlayer
