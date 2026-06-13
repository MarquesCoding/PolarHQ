"use client"

import { type ReactNode, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { TOPBAR_SLOT_ID } from "./FlatTopBar"

/**
 * Teleport page-specific controls into the shared FlatTopBar's action slot, so a page (Trash,
 * Albums, …) can own its button logic while the button renders up in the top bar. Renders
 * nothing until the slot exists on the client.
 */
const TopBarActions = ({ children }: { children: ReactNode }) => {
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setSlot(document.getElementById(TOPBAR_SLOT_ID))
  }, [])
  if (!slot) return null
  return createPortal(children, slot)
}

export default TopBarActions
