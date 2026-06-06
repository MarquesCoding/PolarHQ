"use client"

import { useEffect, useRef, useState } from "react"
import NumberFlow from "@number-flow/react"
import { Icon } from "@lib/icons"
import { IconMinus, IconPlus } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
import { Switch } from "@workspace/ui/components/switch"
import { cn } from "@workspace/ui/lib/utils"
import { AnimatePresence, motion } from "motion/react"

const MIN = 120
const MAX = 330
const STEP = 30
const STEPS = (MAX - MIN) / STEP + 1

const clamp = (value: number, low: number, high: number): number =>
  Math.max(low, Math.min(high, value))

const toIndex = (value: number): number => Math.round((clamp(value, MIN, MAX) - MIN) / STEP)
const toValue = (index: number): number => MIN + index * STEP

interface SizeControlProps {
  value: number
  onChange: (value: number) => void
  gap?: number
  onGapChange?: (value: number) => void
  rounded?: boolean
  onRoundedChange?: (value: boolean) => void
}

const SizeControl = ({
  value,
  onChange,
  gap = 12,
  onGapChange,
  rounded = true,
  onRoundedChange,
}: SizeControlProps) => {
  const [open, setOpen] = useState(false)
  const [scrubbing, setScrubbing] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const barsRef = useRef<HTMLDivElement>(null)
  const index = toIndex(value)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const setFromClientX = (clientX: number) => {
    const el = barsRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
    const next = Math.round(ratio * (STEPS - 1))
    if (next !== index) onChange(toValue(next))
  }

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Photo size"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="image-scale" className="size-5" />
      </Button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="panel absolute top-full right-0 z-50 mt-2 flex w-60 flex-col gap-3 rounded-2xl px-4 py-3 shadow-xl"
          >
            <div className="flex items-center gap-3.5">
            <Icon name="image-upscale" className="text-muted-foreground size-4 shrink-0" />
            <div
              ref={barsRef}
              className="flex h-6 flex-1 touch-none items-center gap-2"
              onPointerDown={(event) => {
                event.preventDefault()
                setScrubbing(true)
                barsRef.current?.setPointerCapture(event.pointerId)
                setFromClientX(event.clientX)
              }}
              onPointerMove={(event) => {
                if (scrubbing) setFromClientX(event.clientX)
              }}
              onPointerUp={() => setScrubbing(false)}
              onPointerCancel={() => setScrubbing(false)}
            >
              {Array.from({ length: STEPS }).map((_, step) => {
                const distance = Math.abs(step - index)
                const height = Math.max(6, 22 - distance * 4)
                const selected = step === index
                return (
                  <motion.span
                    key={step}
                    animate={{ height, opacity: selected ? 1 : Math.max(0.3, 1 - distance * 0.2) }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={cn(
                      "w-2 cursor-pointer rounded-full",
                      selected ? "bg-foreground" : "bg-foreground/55",
                    )}
                  />
                )
              })}
            </div>
            <Icon name="image-scale" className="text-muted-foreground size-5 shrink-0" />
            </div>

            {onGapChange ? (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm">Spacing</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Less spacing"
                      onClick={() => onGapChange(Math.max(0, gap - 2))}
                    >
                      <IconMinus className="size-4" />
                    </Button>
                    <NumberFlow value={gap} className="w-5 text-center text-sm" />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="More spacing"
                      onClick={() => onGapChange(Math.min(16, gap + 2))}
                    >
                      <IconPlus className="size-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : null}

            {onRoundedChange ? (
              <div className="flex items-center justify-between">
                <span className="text-sm">Rounded corners</span>
                <Switch checked={rounded} onCheckedChange={onRoundedChange} />
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default SizeControl
