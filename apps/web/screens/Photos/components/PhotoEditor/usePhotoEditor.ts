"use client"

import { type PointerEvent as ReactPointerEvent, type RefObject, useEffect, useMemo, useRef, useState } from "react"
import { type GridAsset, stackAssets, uploadAsset } from "@lib/photos"
import { uploadEncryptedMedia } from "@lib/photosE2e"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

export interface Adjustments {
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

export interface CropRect {
  x: number
  y: number
  w: number
  h: number
}

export const FULL_CROP: CropRect = { x: 0, y: 0, w: 1, h: 1 }

export interface TextOverlay {
  id: string
  text: string
  x: number
  y: number
  size: number
  color: string
}

export const TEXT_COLORS = ["#ffffff", "#000000", "#f43f5e", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7"]

export const ADJUSTERS: { key: keyof Adjustments; labelKey: string }[] = [
  { key: "exposure", labelKey: "photoEditor.exposure" },
  { key: "contrast", labelKey: "photoEditor.contrast" },
  { key: "saturation", labelKey: "photoEditor.saturation" },
  { key: "warmth", labelKey: "photoEditor.warmth" },
  { key: "vignette", labelKey: "photoEditor.vignette" },
]

export const ASPECTS: { label: string; labelKey?: string; value: number | null }[] = [
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

export type Tool = "adjust" | "crop" | "text"

export interface Histogram {
  r: number[]
  g: number[]
  b: number[]
}

interface UsePhotoEditorOptions {
  asset: GridAsset
  sourceUrl: string
  /** Only fetch the source + render while the editor is actually open in the Lightbox. */
  enabled: boolean
  onSaved: () => void
  onClose: () => void
}

export interface PhotoEditorController {
  canvasRef: RefObject<HTMLCanvasElement | null>
  stageRef: RefObject<HTMLDivElement | null>
  ready: boolean
  tool: Tool
  setTool: (tool: Tool) => void
  adjustments: Adjustments
  setAdjustments: (updater: (current: Adjustments) => Adjustments) => void
  rotation: number
  rotate90: () => void
  crop: CropRect
  setCrop: (next: CropRect) => void
  aspect: number | null
  applyAspect: (value: number | null) => void
  texts: TextOverlay[]
  setTexts: (updater: (current: TextOverlay[]) => TextOverlay[]) => void
  activeText: string | null
  setActiveText: (id: string | null) => void
  active: TextOverlay | undefined
  addText: () => void
  histogram: Histogram | null
  dirty: boolean
  saving: boolean
  reset: () => void
  save: () => Promise<void>
  onTextPointerDown: (event: ReactPointerEvent, overlay: TextOverlay) => void
  onTextPointerMove: (event: ReactPointerEvent) => void
  onTextPointerUp: (event: ReactPointerEvent) => void
  onCropDown: (event: ReactPointerEvent, handle: string) => void
  onCropMove: (event: ReactPointerEvent) => void
  onCropUp: (event: ReactPointerEvent) => void
}

/**
 * Owns the non-destructive editor state (rotate + crop, tonal/colour adjustments, a live RGB
 * histogram and draggable text overlays) and the canvas rendering. The Lightbox renders the two
 * halves separately — {@link PhotoEditorController.canvasRef} in its main stage and the controls in
 * its side panel — so editing happens in-place rather than in a separate modal. Saving renders the
 * result at full resolution, uploads it as a new asset and stacks it over the original as a
 * before/after pair. Heavy work (fetch + paint) only runs while `enabled`.
 */
export const usePhotoEditor = ({
  asset,
  sourceUrl,
  enabled,
  onSaved,
  onClose,
}: UsePhotoEditorOptions): PhotoEditorController => {
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
  const [histogram, setHistogram] = useState<Histogram | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled || !sourceUrl) return
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
  }, [sourceUrl, enabled])

  useEffect(() => {
    if (enabled) return
    setBitmap(null)
    setTool("adjust")
    setAdjustments(NEUTRAL)
    setRotation(0)
    setCrop(FULL_CROP)
    setAspect(null)
    setTexts([])
    setActiveText(null)
    setHistogram(null)
  }, [enabled])

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

  const rotate90 = () => setRotation((r) => (r + 90) % 360)

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

  return {
    canvasRef,
    stageRef,
    ready: !!rotated,
    tool,
    setTool,
    adjustments,
    setAdjustments,
    rotation,
    rotate90,
    crop,
    setCrop,
    aspect,
    applyAspect,
    texts,
    setTexts,
    activeText,
    setActiveText,
    active,
    addText,
    histogram,
    dirty,
    saving,
    reset,
    save,
    onTextPointerDown,
    onTextPointerMove,
    onTextPointerUp,
    onCropDown,
    onCropMove,
    onCropUp,
  }
}
