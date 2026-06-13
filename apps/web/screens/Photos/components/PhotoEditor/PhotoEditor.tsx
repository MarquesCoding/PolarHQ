"use client"

import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react"
import { Icon } from "@lib/icons"
import { type GridAsset, stackAssets, uploadAsset } from "@lib/photos"
import { uploadEncryptedMedia } from "@lib/photosE2e"
import { useQueryClient } from "@tanstack/react-query"
import {
  IconCrop,
  IconLetterT,
  IconRotateClockwise,
  IconSparkles,
  IconX,
} from "@tabler/icons-react"
import { Button } from "@polarhq/ui/components/button"
import { Input } from "@polarhq/ui/components/input"
import { Slider } from "@polarhq/ui/components/slider"
import { cn } from "@polarhq/ui/lib/utils"
import { motion } from "motion/react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

interface Adjustments {
  exposure: number
  contrast: number
  saturation: number
  warmth: number
  vignette: number
}

const NEUTRAL: Adjustments = {
  exposure: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
  vignette: 0,
}

interface CropRect {
  x: number
  y: number
  w: number
  h: number
}

const FULL_CROP: CropRect = { x: 0, y: 0, w: 1, h: 1 }

interface TextOverlay {
  id: string
  text: string
  x: number
  y: number
  size: number
  color: string
}

const TEXT_COLORS = ["#ffffff", "#000000", "#f43f5e", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7"]

const ADJUSTERS: { key: keyof Adjustments; labelKey: string }[] = [
  { key: "exposure", labelKey: "photoEditor.exposure" },
  { key: "contrast", labelKey: "photoEditor.contrast" },
  { key: "saturation", labelKey: "photoEditor.saturation" },
  { key: "warmth", labelKey: "photoEditor.warmth" },
  { key: "vignette", labelKey: "photoEditor.vignette" },
]

const ASPECTS: { label: string; labelKey?: string; value: number | null }[] = [
  { label: "Free", labelKey: "photoEditor.free", value: null },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
  { label: "16:9", value: 16 / 9 },
]

const filterFor = (adj: Adjustments): string =>
  [
    `brightness(${1 + adj.exposure / 100})`,
    `contrast(${1 + adj.contrast / 100})`,
    `saturate(${1 + adj.saturation / 100})`,
  ].join(" ")

type Tool = "adjust" | "crop" | "text"

interface PhotoEditorProps {
  asset: GridAsset
  sourceUrl: string
  onClose: () => void
  onSaved: () => void
}

/**
 * Full-screen non-destructive editor: rotate + crop, tonal/colour adjustments, a live RGB
 * histogram and draggable text overlays. Saving renders the result at full resolution, uploads
 * it as a new asset and stacks it over the original so the pair reads as a before/after.
 */
const PhotoEditor = ({ asset, sourceUrl, onClose, onSaved }: PhotoEditorProps) => {
  const { t } = useTranslation("photos")
  const queryClient = useQueryClient()
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null)
  const [tool, setTool] = useState<Tool>("adjust")
  const [adjustments, setAdjustments] = useState<Adjustments>(NEUTRAL)
  const [rotation, setRotation] = useState(0)
  const [crop, setCrop] = useState<CropRect>(FULL_CROP)
  const [aspect, setAspect] = useState<number | null>(null)
  const [texts, setTexts] = useState<TextOverlay[]>([])
  const [activeText, setActiveText] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [histogram, setHistogram] = useState<{ r: number[]; g: number[]; b: number[] } | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    void fetch(sourceUrl, { credentials: "include" })
      .then((response) => response.blob())
      .then((blob) => createImageBitmap(blob))
      .then((result) => {
        if (active) setBitmap(result)
        else result.close()
      })
      .catch(() => toast.error(t("photoEditor.openFailed")))
    return () => {
      active = false
    }
  }, [sourceUrl])

  /** The source rotated into an upright bitmap-sized canvas (crop space). */
  const rotated = useMemo(() => {
    if (!bitmap) return null
    const swap = rotation % 180 !== 0
    const canvas = document.createElement("canvas")
    canvas.width = swap ? bitmap.height : bitmap.width
    canvas.height = swap ? bitmap.width : bitmap.height
    const context = canvas.getContext("2d")
    if (!context) return null
    context.translate(canvas.width / 2, canvas.height / 2)
    context.rotate((rotation * Math.PI) / 180)
    context.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2)
    return canvas
  }, [bitmap, rotation])

  /** Paint the rotated source, applying crop (unless cropping), filters, warmth, vignette + text. */
  const paint = (target: HTMLCanvasElement, exporting: boolean) => {
    if (!rotated) return
    const showFull = tool === "crop" && !exporting
    const region = showFull ? FULL_CROP : crop
    const sx = region.x * rotated.width
    const sy = region.y * rotated.height
    const sw = region.w * rotated.width
    const sh = region.h * rotated.height
    target.width = Math.max(1, Math.round(sw))
    target.height = Math.max(1, Math.round(sh))
    const context = target.getContext("2d")
    if (!context) return

    context.filter = filterFor(adjustments)
    context.drawImage(rotated, sx, sy, sw, sh, 0, 0, target.width, target.height)
    context.filter = "none"

    if (adjustments.warmth !== 0) {
      context.globalCompositeOperation = "soft-light"
      context.globalAlpha = Math.min(0.6, Math.abs(adjustments.warmth) / 100)
      context.fillStyle = adjustments.warmth > 0 ? "#ff8a3d" : "#3da5ff"
      context.fillRect(0, 0, target.width, target.height)
      context.globalAlpha = 1
      context.globalCompositeOperation = "source-over"
    }

    if (adjustments.vignette > 0) {
      const gradient = context.createRadialGradient(
        target.width / 2,
        target.height / 2,
        Math.min(target.width, target.height) * 0.3,
        target.width / 2,
        target.height / 2,
        Math.max(target.width, target.height) * 0.75,
      )
      gradient.addColorStop(0, "rgba(0,0,0,0)")
      gradient.addColorStop(1, `rgba(0,0,0,${Math.min(0.85, adjustments.vignette / 100)})`)
      context.fillStyle = gradient
      context.fillRect(0, 0, target.width, target.height)
    }

    if (!showFull) {
      for (const overlay of texts) {
        const fontSize = (overlay.size / 100) * target.width
        context.font = `600 ${fontSize}px Inter, system-ui, sans-serif`
        context.fillStyle = overlay.color
        context.textBaseline = "middle"
        context.shadowColor = "rgba(0,0,0,0.45)"
        context.shadowBlur = fontSize * 0.08
        context.fillText(overlay.text, overlay.x * target.width, overlay.y * target.height)
        context.shadowBlur = 0
      }
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !rotated) return
    paint(canvas, false)
    const sample = document.createElement("canvas")
    const scale = Math.min(1, 200 / canvas.width)
    sample.width = Math.max(1, Math.round(canvas.width * scale))
    sample.height = Math.max(1, Math.round(canvas.height * scale))
    const context = sample.getContext("2d")
    if (!context) return
    context.drawImage(canvas, 0, 0, sample.width, sample.height)
    const { data } = context.getImageData(0, 0, sample.width, sample.height)
    const r = new Array(256).fill(0)
    const g = new Array(256).fill(0)
    const b = new Array(256).fill(0)
    for (let i = 0; i < data.length; i += 4) {
      r[data[i]!]++
      g[data[i + 1]!]++
      b[data[i + 2]!]++
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistogram({ r, g, b })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotated, adjustments, crop, texts, tool])

  const reset = () => {
    setAdjustments(NEUTRAL)
    setRotation(0)
    setCrop(FULL_CROP)
    setAspect(null)
    setTexts([])
  }

  const dirty =
    JSON.stringify(adjustments) !== JSON.stringify(NEUTRAL) ||
    rotation !== 0 ||
    crop.x !== 0 ||
    crop.y !== 0 ||
    crop.w !== 1 ||
    crop.h !== 1 ||
    texts.length > 0

  const applyAspect = (value: number | null) => {
    setAspect(value)
    if (value == null || !rotated) return
    const imageAspect = rotated.width / rotated.height
    let w = 1
    let h = 1
    if (value > imageAspect) h = imageAspect / value
    else w = value / imageAspect
    setCrop({ x: (1 - w) / 2, y: (1 - h) / 2, w, h })
  }

  const addText = () => {
    const id = `t-${texts.length}-${rotation}-${texts.reduce((sum, item) => sum + item.text.length, 1)}`
    setTexts((current) => [
      ...current,
      { id, text: t("photoEditor.defaultText"), x: 0.5, y: 0.5, size: 8, color: "#ffffff" },
    ])
    setActiveText(id)
    setTool("text")
  }

  const save = async () => {
    if (!rotated || saving) return
    setSaving(true)
    try {
      const out = document.createElement("canvas")
      paint(out, true)
      const blob = await new Promise<Blob | null>((resolve) =>
        out.toBlob((result) => resolve(result), "image/png"),
      )
      if (!blob) throw new Error("encode failed")
      const baseName = asset.originalFilename.replace(/\.[^.]+$/, "")
      const file = new File([blob], `${baseName} (edited).png`, { type: "image/png" })
      const edited = asset.encrypted
        ? await uploadEncryptedMedia(file)
        : (await uploadAsset(file)).asset
      await stackAssets([edited.id, asset.id]).catch(() => undefined)
      await queryClient.invalidateQueries({ queryKey: ["photos"] })
      toast.success(t("photoEditor.saved"))
      onSaved()
      onClose()
    } catch {
      toast.error(t("photoEditor.saveFailed"))
      setSaving(false)
    }
  }

  const drag = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null)
  const onTextPointerDown = (event: ReactPointerEvent, overlay: TextOverlay) => {
    event.stopPropagation()
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect) return
    setActiveText(overlay.id)
    drag.current = {
      id: overlay.id,
      offsetX: (event.clientX - rect.left) / rect.width - overlay.x,
      offsetY: (event.clientY - rect.top) / rect.height - overlay.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const onTextPointerMove = (event: ReactPointerEvent) => {
    if (!drag.current) return
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = (event.clientX - rect.left) / rect.width - drag.current.offsetX
    const y = (event.clientY - rect.top) / rect.height - drag.current.offsetY
    setTexts((current) =>
      current.map((item) =>
        item.id === drag.current!.id
          ? { ...item, x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) }
          : item,
      ),
    )
  }
  const onTextPointerUp = (event: ReactPointerEvent) => {
    drag.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  const cropDrag = useRef<{ handle: string; start: CropRect; px: number; py: number } | null>(null)
  const onCropDown = (event: ReactPointerEvent, handle: string) => {
    event.stopPropagation()
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect) return
    cropDrag.current = {
      handle,
      start: crop,
      px: (event.clientX - rect.left) / rect.width,
      py: (event.clientY - rect.top) / rect.height,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const onCropMove = (event: ReactPointerEvent) => {
    const state = cropDrag.current
    const rect = stageRef.current?.getBoundingClientRect()
    if (!state || !rect) return
    const dx = (event.clientX - rect.left) / rect.width - state.px
    const dy = (event.clientY - rect.top) / rect.height - state.py
    const next = { ...state.start }
    if (state.handle === "move") {
      next.x = Math.min(1 - next.w, Math.max(0, state.start.x + dx))
      next.y = Math.min(1 - next.h, Math.max(0, state.start.y + dy))
    } else {
      if (state.handle.includes("e")) next.w = Math.max(0.1, Math.min(1 - next.x, state.start.w + dx))
      if (state.handle.includes("s")) next.h = Math.max(0.1, Math.min(1 - next.y, state.start.h + dy))
      if (state.handle.includes("w")) {
        const nx = Math.max(0, Math.min(state.start.x + state.start.w - 0.1, state.start.x + dx))
        next.w = state.start.w + (state.start.x - nx)
        next.x = nx
      }
      if (state.handle.includes("n")) {
        const ny = Math.max(0, Math.min(state.start.y + state.start.h - 0.1, state.start.y + dy))
        next.h = state.start.h + (state.start.y - ny)
        next.y = ny
      }
      setAspect(null)
    }
    setCrop(next)
  }
  const onCropUp = (event: ReactPointerEvent) => {
    cropDrag.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  const active = texts.find((item) => item.id === activeText)

  return (
    <motion.div
      className="bg-background fixed inset-0 z-50 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <Button variant="ghost" size="icon-sm" aria-label={t("photoEditor.closeEditor")} onClick={onClose}>
          <IconX className="size-5" />
        </Button>
        <span className="text-sm font-medium">{t("photoEditor.title")}</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={reset} disabled={!dirty || saving}>
            {t("photoEditor.reset")}
          </Button>
          <Button size="sm" onClick={save} disabled={!dirty || saving}>
            {saving ? t("photoEditor.saving") : t("photoEditor.saveCopy")}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div
          ref={stageRef}
          className="bg-muted/20 relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-6"
          onPointerMove={(event) => {
            onTextPointerMove(event)
            onCropMove(event)
          }}
          onPointerUp={(event) => {
            onTextPointerUp(event)
            onCropUp(event)
          }}
        >
          <div className="relative max-h-full max-w-full">
            <canvas ref={canvasRef} className="max-h-[calc(100svh-9rem)] max-w-full rounded-lg object-contain shadow-lg" />

            {tool === "text"
              ? texts.map((overlay) => (
                  <div
                    key={overlay.id}
                    onPointerDown={(event) => onTextPointerDown(event, overlay)}
                    style={{
                      left: `${overlay.x * 100}%`,
                      top: `${overlay.y * 100}%`,
                      color: overlay.color,
                      fontSize: `${overlay.size * 0.5}vw`,
                    }}
                    className={cn(
                      "absolute -translate-x-1/2 -translate-y-1/2 cursor-move font-semibold whitespace-nowrap drop-shadow select-none",
                      overlay.id === activeText && "ring-primary rounded-sm ring-2 ring-offset-1",
                    )}
                  >
                    {overlay.text || " "}
                  </div>
                ))
              : null}

            {tool === "crop" ? (
              <div
                onPointerDown={(event) => onCropDown(event, "move")}
                style={{
                  left: `${crop.x * 100}%`,
                  top: `${crop.y * 100}%`,
                  width: `${crop.w * 100}%`,
                  height: `${crop.h * 100}%`,
                }}
                className="absolute cursor-move border border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
              >
                {(["nw", "ne", "sw", "se"] as const).map((handle) => (
                  <span
                    key={handle}
                    onPointerDown={(event) => onCropDown(event, handle)}
                    className={cn(
                      "absolute size-3 rounded-full border border-black/30 bg-white",
                      handle.includes("n") ? "-top-1.5" : "-bottom-1.5",
                      handle.includes("w") ? "-left-1.5" : "-right-1.5",
                      handle === "nw" && "cursor-nwse-resize",
                      handle === "se" && "cursor-nwse-resize",
                      handle === "ne" && "cursor-nesw-resize",
                      handle === "sw" && "cursor-nesw-resize",
                    )}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l p-4">
          <div className="bg-muted/40 flex items-center gap-1 rounded-lg p-1">
            {(
              [
                { key: "adjust", label: t("photoEditor.adjust"), icon: <IconSparkles className="size-4" /> },
                { key: "crop", label: t("photoEditor.crop"), icon: <IconCrop className="size-4" /> },
                { key: "text", label: t("photoEditor.text"), icon: <IconLetterT className="size-4" /> },
              ] as const
            ).map((item) => (
              <Button
                key={item.key}
                variant={tool === item.key ? "default" : "ghost"}
                size="sm"
                className="flex-1"
                onClick={() => setTool(item.key)}
              >
                {item.icon}
                {item.label}
              </Button>
            ))}
          </div>

          {histogram ? (
            <Histogram histogram={histogram} />
          ) : null}

          {tool === "adjust" ? (
            <div className="flex flex-col gap-3">
              {ADJUSTERS.map(({ key, labelKey }) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t(labelKey)}</span>
                    <span className="tabular-nums">{adjustments[key]}</span>
                  </div>
                  <Slider
                    min={key === "vignette" ? 0 : -100}
                    max={100}
                    value={[adjustments[key]]}
                    onValueChange={(value) =>
                      setAdjustments((current) => ({
                        ...current,
                        [key]: Math.round(Array.isArray(value) ? (value[0] ?? 0) : value),
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          ) : null}

          {tool === "crop" ? (
            <div className="flex flex-col gap-3">
              <Button variant="outline" size="sm" onClick={() => setRotation((r) => (r + 90) % 360)}>
                <IconRotateClockwise className="size-4" />
                {t("photoEditor.rotate90")}
              </Button>
              <div className="grid grid-cols-3 gap-1.5">
                {ASPECTS.map((item) => (
                  <Button
                    key={item.label}
                    variant={aspect === item.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => applyAspect(item.value)}
                  >
                    {item.labelKey ? t(item.labelKey) : item.label}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    applyAspect(null)
                    setCrop(FULL_CROP)
                  }}
                >
                  {t("photoEditor.reset")}
                </Button>
              </div>
            </div>
          ) : null}

          {tool === "text" ? (
            <div className="flex flex-col gap-3">
              <Button variant="outline" size="sm" onClick={addText}>
                <IconLetterT className="size-4" />
                {t("photoEditor.addText")}
              </Button>
              {active ? (
                <>
                  <Input
                    value={active.text}
                    placeholder={t("photoEditor.textPlaceholder")}
                    onChange={(event) =>
                      setTexts((current) =>
                        current.map((item) =>
                          item.id === active.id ? { ...item, text: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <div className="flex flex-col gap-1.5">
                    <span className="text-muted-foreground text-xs">{t("photoEditor.size")}</span>
                    <Slider
                      min={3}
                      max={20}
                      value={[active.size]}
                      onValueChange={(value) =>
                        setTexts((current) =>
                          current.map((item) =>
                            item.id === active.id
                              ? { ...item, size: Math.round(Array.isArray(value) ? (value[0] ?? 8) : value) }
                              : item,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {TEXT_COLORS.map((color) => (
                      <Button
                        key={color}
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("photoEditor.colour", { color })}
                        onClick={() =>
                          setTexts((current) =>
                            current.map((item) =>
                              item.id === active.id ? { ...item, color } : item,
                            ),
                          )
                        }
                        className={cn(
                          "rounded-full border",
                          active.color === color && "ring-primary ring-2",
                        )}
                        style={{ backgroundColor: color }}
                      >
                        <span className="sr-only">{color}</span>
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTexts((current) => current.filter((item) => item.id !== active.id))
                      setActiveText(null)
                    }}
                  >
                    <Icon name="trash" className="size-4" />
                    {t("photoEditor.removeText")}
                  </Button>
                </>
              ) : (
                <p className="text-muted-foreground text-xs">{t("photoEditor.textHint")}</p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}

const Histogram = ({ histogram }: { histogram: { r: number[]; g: number[]; b: number[] } }) => {
  const max = Math.max(1, ...histogram.r, ...histogram.g, ...histogram.b)
  const path = (values: number[]): string =>
    values
      .map((value, index) => {
        const x = (index / 255) * 100
        const y = 100 - (value / max) * 100
        return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`
      })
      .join(" ")
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="bg-muted/40 h-20 w-full rounded-md">
      <path d={`${path(histogram.r)} L100,100 L0,100 Z`} fill="rgb(244 63 94 / 0.4)" />
      <path d={`${path(histogram.g)} L100,100 L0,100 Z`} fill="rgb(34 197 94 / 0.4)" />
      <path d={`${path(histogram.b)} L100,100 L0,100 Z`} fill="rgb(59 130 246 / 0.4)" />
    </svg>
  )
}

export default PhotoEditor
