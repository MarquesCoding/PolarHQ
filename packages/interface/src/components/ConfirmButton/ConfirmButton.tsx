"use client"

import { type ReactNode, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { buttonVariants } from "@polarhq/ui/components/button"
import { cn } from "@polarhq/ui/lib/utils"
import { AnimatePresence, motion } from "motion/react"

interface ConfirmButtonProps {
  /** Uncontrolled: called on the second click (after arming). */
  onConfirm?: () => void
  /** Controlled: when provided, `armed` drives the look and every click calls `onTrigger`. */
  armed?: boolean
  onTrigger?: () => void
  children: ReactNode
  confirmLabel?: string
  icon?: ReactNode
  idleVariant?: "ghost" | "outline" | "secondary" | "destructive-solid"
}

const ConfirmButton = ({
  onConfirm,
  armed: armedProp,
  onTrigger,
  children,
  confirmLabel,
  icon,
  idleVariant = "ghost",
}: ConfirmButtonProps) => {
  const { t } = useTranslation("common")
  const resolvedConfirmLabel = confirmLabel ?? t("confirmButton.confirm")
  const [internalArmed, setInternalArmed] = useState(false)
  const timer = useRef<number | null>(null)
  const controlled = onTrigger !== undefined
  const armed = controlled ? Boolean(armedProp) : internalArmed

  useEffect(() => () => clearTimeout(timer.current ?? undefined), [])

  const handleClick = () => {
    if (controlled) {
      onTrigger?.()
      return
    }
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    if (internalArmed) {
      setInternalArmed(false)
      onConfirm?.()
      return
    }
    setInternalArmed(true)
    timer.current = window.setTimeout(() => setInternalArmed(false), 4000)
  }

  return (
    <motion.button
      type="button"
      layout="size"
      transition={{ layout: { duration: 0.2, ease: "easeOut" } }}
      onClick={handleClick}
      className={cn(
        buttonVariants({
          variant: armed
            ? idleVariant === "destructive-solid"
              ? "destructive-solid"
              : "destructive"
            : idleVariant,
          size: "sm",
        }),
        "overflow-hidden",
      )}
    >
      {icon}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={armed ? "confirm" : "idle"}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.12 }}
        >
          {armed ? resolvedConfirmLabel : children}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}

export default ConfirmButton
