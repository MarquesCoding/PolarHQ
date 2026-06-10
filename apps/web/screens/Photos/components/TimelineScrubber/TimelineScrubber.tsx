"use client"

import { type PointerEvent as ReactPointerEvent, type RefObject, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "motion/react"
import { CONTENT_OVERLAY_ID } from "@components/FlatShell"

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
  const [slot, setSlot] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setSlot(document.getElementById(CONTENT_OVERLAY_ID))
  }, [])

  if (markers.length === 0 || totalHeight <= 0 || !slot) return null

  const setFromY = (clientY: number) => {
    const rect = rootRef.current?.getBoundingClientRect()
    if (rect) setFraction(clamp((clientY - rect.top) / rect.height, 0, 1))
  }

  const targetY = fraction * totalHeight
  const current = [...markers].reverse().find((marker) => marker.y <= targetY) ?? markers[0]!
  const active = open || scrubbing

  const onDown = (event: ReactPointerEvent) => {
    setScrubbing(true)
    rootRef.current?.setPointerCapture(event.pointerId)
    setFromY(event.clientY)
  }
  const onMove = (event: ReactPointerEvent) => {
    if (active) setFromY(event.clientY)
  }
  const onUp = () => {
    if (!scrubbing) return
    setScrubbing(false)
    setOpen(false)
    onScrubTo(fraction * totalHeight)
  }

  const rail = (
    <div
      ref={rootRef}
      className="bg-sidebar/40 border-border pointer-events-auto h-full w-6 touch-none border-r"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (!scrubbing) setOpen(false)
      }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <div className="relative h-full w-full py-2">
        {markers.map((marker, index) => {
            const f = marker.y / totalHeight
            const distance = Math.abs(f - fraction)
            const width = active ? Math.max(6, 15 - distance * 200) : 7
            return (
              <motion.span
                key={index}
                className="bg-foreground/30 absolute left-1/2 h-[2px] -translate-x-1/2 rounded-full"
                style={{ top: `${f * 100}%` }}
                animate={{ width }}
                transition={{ type: "spring", stiffness: 500, damping: 34 }}
              />
            )
          })}

          {active ? (
            <motion.span
              className="bg-primary absolute left-1/2 h-1 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
              animate={{ top: `${fraction * 100}%` }}
              transition={{ type: "tween", duration: scrubbing ? 0 : 0.12 }}
            />
          ) : null}

          <AnimatePresence>
            {active ? (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.12 }}
                className="panel pointer-events-none absolute left-full z-50 ml-2 rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap shadow-lg"
                style={{ top: `${fraction * 100}%`, transform: "translateY(-50%)" }}
              >
                {current.label}
              </motion.div>
            ) : null}
          </AnimatePresence>
      </div>
    </div>
  )

  return createPortal(rail, slot)
}

export default TimelineScrubber
