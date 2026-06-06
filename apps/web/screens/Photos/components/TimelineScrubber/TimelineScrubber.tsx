"use client"

import { type PointerEvent as ReactPointerEvent, type RefObject, useState } from "react"
import { AnimatePresence, motion } from "motion/react"

export interface TimelineMarker {
  y: number
  label: string
}

const clamp = (value: number, low: number, high: number): number =>
  Math.max(low, Math.min(high, value))

interface TimelineScrubberProps {
  rootRef: RefObject<HTMLDivElement | null>
  markers: TimelineMarker[]
  totalHeight: number
  onScrubTo: (y: number) => void
}

const TimelineScrubber = ({ rootRef, markers, totalHeight, onScrubTo }: TimelineScrubberProps) => {
  const [open, setOpen] = useState(false)
  const [scrubbing, setScrubbing] = useState(false)
  const [fraction, setFraction] = useState(0)

  if (markers.length === 0 || totalHeight <= 0) return null

  const setFromY = (clientY: number) => {
    const rect = rootRef.current?.getBoundingClientRect()
    if (rect) setFraction(clamp((clientY - rect.top - 8) / (rect.height - 16), 0, 1))
  }

  const targetY = fraction * totalHeight
  const current = [...markers].reverse().find((marker) => marker.y <= targetY) ?? markers[0]!

  const onDown = (event: ReactPointerEvent) => {
    setScrubbing(true)
    rootRef.current?.setPointerCapture(event.pointerId)
    setFromY(event.clientY)
  }
  const onMove = (event: ReactPointerEvent) => {
    if (open || scrubbing) setFromY(event.clientY)
  }
  const onUp = () => {
    if (!scrubbing) return
    setScrubbing(false)
    setOpen(false)
    onScrubTo(fraction * totalHeight)
  }

  return (
    <div
      ref={rootRef}
      className="absolute z-40 w-5 touch-none"
      style={{ left: 2 }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (!scrubbing) setOpen(false)
      }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <AnimatePresence>
        {open || scrubbing ? (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="panel pointer-events-none absolute inset-x-0 inset-y-2 rounded-full shadow-xl"
          >
            <div className="relative h-full w-full">
              {markers.map((marker, index) => {
                const f = marker.y / totalHeight
                const distance = Math.abs(f - fraction)
                const width = Math.max(7, 17 - distance * 220)
                return (
                  <motion.span
                    key={index}
                    className="bg-foreground/35 absolute left-1/2 h-[2px] -translate-x-1/2 rounded-full"
                    style={{ top: `${f * 100}%` }}
                    animate={{ width }}
                    transition={{ type: "spring", stiffness: 500, damping: 34 }}
                  />
                )
              })}

              <motion.span
                className="bg-primary absolute left-1/2 h-1 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                animate={{ top: `${fraction * 100}%` }}
                transition={{ type: "tween", duration: scrubbing ? 0 : 0.12 }}
              />

              <div
                className="panel absolute left-full ml-3 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap shadow-lg"
                style={{ top: `${fraction * 100}%`, transform: "translateY(-50%)" }}
              >
                {current.label}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default TimelineScrubber
