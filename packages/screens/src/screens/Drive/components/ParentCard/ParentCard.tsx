import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Icon } from "@workspace/screens/icons"
import { cn } from "@workspace/ui/lib/utils"
import { DRIVE_NODES_MIME } from "@pages/Drive/components/NodeCard/NodeCard"

interface ParentCardProps {
  onOpen: () => void
  onDrop: (ids: string[]) => void
}

/** The ".." entry — navigates up a level (spring-loads on hover), and accepts drops to move up. */
const ParentCard = ({ onOpen, onDrop }: ParentCardProps) => {
  const { t } = useTranslation("drive")
  const [over, setOver] = useState(false)
  const [blink, setBlink] = useState(false)
  const springTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const ready = useRef(false)

  const clearSpring = () => {
    clearTimeout(springTimer.current)
    springTimer.current = undefined
    setBlink(false)
  }
  useEffect(() => {
    const timer = setTimeout(() => {
      ready.current = true
    }, 300)
    return () => {
      clearTimeout(timer)
      clearTimeout(springTimer.current)
    }
  }, [])

  const open = () => {
    if (ready.current) onOpen()
  }

  return (
    <div
      onDoubleClick={open}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(DRIVE_NODES_MIME)) return
        event.preventDefault()
        setOver(true)
        if (!springTimer.current) {
          springTimer.current = setTimeout(() => {
            setBlink(true)
            springTimer.current = setTimeout(onOpen, 350)
          }, 1300)
        }
      }}
      onDragLeave={() => {
        setOver(false)
        clearSpring()
      }}
      onDrop={(event) => {
        event.preventDefault()
        event.stopPropagation()
        setOver(false)
        clearSpring()
        const raw = event.dataTransfer.getData(DRIVE_NODES_MIME)
        if (!raw) return
        const ids = JSON.parse(raw) as string[]
        if (ids.length > 0) onDrop(ids)
      }}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center gap-1.5 rounded-xl p-2 transition hover:bg-sidebar-accent/40",
        over && "ring-primary ring-2",
        blink && "ring-primary animate-pulse ring-4",
      )}
    >
      <div className="flex aspect-square w-full items-center justify-center">
        <Icon name="folder-open" className="text-muted-foreground size-16" />
      </div>
      <div className="flex w-full flex-col items-center gap-0.5">
        <span className="truncate text-sm font-medium">..</span>
        <span className="text-muted-foreground text-xs">{t("parentCard.parentFolder")}</span>
      </div>
    </div>
  )
}

export default ParentCard
