import { type MouseEvent, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import type { DriveNode } from "@workspace/core/drive"
import { fetchDecryptedThumbnail } from "@workspace/core/driveE2e"
import { formatBytes } from "@workspace/core/format"
import { Star } from "@phosphor-icons/react"
import { cn } from "@workspace/ui/lib/utils"
import Spinner from "@components/Spinner/Spinner"
import { FileIcon } from "../../fileIcon"

export const DRIVE_NODES_MIME = "application/x-drive-nodes"

/** Thumbnail URLs that have decoded this session — lets a re-rendered card skip the spinner. */
const loadedThumbnails = new Set<string>()

interface NodeCardProps {
  node: DriveNode
  selected: boolean
  onOpen: (node: DriveNode) => void
  onSelect: (node: DriveNode, shiftKey: boolean, additive: boolean) => void
  onToggle: (node: DriveNode) => void
  dragIds: string[]
  onDropNodes?: (folder: DriveNode, ids: string[]) => void
  onSpringInto?: (folder: DriveNode) => void
}

const NodeCard = ({
  node,
  selected,
  onOpen,
  onSelect,
  onToggle,
  dragIds,
  onDropNodes,
  onSpringInto,
}: NodeCardProps) => {
  const { t } = useTranslation("drive")
  const isFolder = node.kind === "folder"
  const canDrop = isFolder && Boolean(onDropNodes)
  const [over, setOver] = useState(false)
  const [blink, setBlink] = useState(false)
  const [thumbLoaded, setThumbLoaded] = useState(() =>
    node.thumbnailUrl ? loadedThumbnails.has(node.thumbnailUrl) : false,
  )
  const [decryptedThumb, setDecryptedThumb] = useState<string | null>(null)
  const springTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const thumbUrl = node.thumbnailUrl ?? decryptedThumb

  useEffect(() => {
    setThumbLoaded(node.thumbnailUrl ? loadedThumbnails.has(node.thumbnailUrl) : false)
  }, [node.thumbnailUrl])

  useEffect(() => {
    if (!node.encrypted || !(node.mimeType ?? "").startsWith("image/")) return
    let url: string | null = null
    let cancelled = false
    void fetchDecryptedThumbnail(node.id).then((decrypted) => {
      if (cancelled) {
        if (decrypted) URL.revokeObjectURL(decrypted)
        return
      }
      url = decrypted
      setDecryptedThumb(decrypted)
    })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [node.id, node.encrypted, node.mimeType])

  const clearSpring = () => {
    clearTimeout(springTimer.current)
    springTimer.current = undefined
    setBlink(false)
  }
  useEffect(() => () => clearTimeout(springTimer.current), [])

  return (
    <div
      data-node-card={node.id}
      draggable={!node.special}
      onDragStart={(event) => {
        event.dataTransfer.setData(DRIVE_NODES_MIME, JSON.stringify(dragIds))
        event.dataTransfer.effectAllowed = "move"
      }}
      onDragOver={
        canDrop
          ? (event) => {
              if (!event.dataTransfer.types.includes(DRIVE_NODES_MIME)) return
              event.preventDefault()
              setOver(true)
              if (onSpringInto && !springTimer.current) {
                springTimer.current = setTimeout(() => {
                  setBlink(true)
                  springTimer.current = setTimeout(() => onSpringInto(node), 350)
                }, 1300)
              }
            }
          : undefined
      }
      onDragLeave={
        canDrop
          ? () => {
              setOver(false)
              clearSpring()
            }
          : undefined
      }
      onDrop={
        canDrop
          ? (event) => {
              event.preventDefault()
              event.stopPropagation()
              setOver(false)
              clearSpring()
              const raw = event.dataTransfer.getData(DRIVE_NODES_MIME)
              if (!raw) return
              const ids = (JSON.parse(raw) as string[]).filter((id) => id !== node.id)
              if (ids.length > 0) onDropNodes!(node, ids)
            }
          : undefined
      }
      onClick={(event: MouseEvent) => onSelect(node, event.shiftKey, event.metaKey || event.ctrlKey)}
      onDoubleClick={() => onOpen(node)}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center gap-1.5 rounded-xl p-2 transition",
        selected ? "bg-sidebar-accent/50" : "hover:bg-sidebar-accent/40",
        over && "ring-primary ring-2",
        blink && "ring-primary animate-pulse ring-4",
      )}
    >
      {node.favorite ? (
        <span className="absolute top-1 right-1 z-10 flex size-6 items-center justify-center">
          <Star weight="fill" className="size-4 text-amber-400 drop-shadow" />
        </span>
      ) : null}

      <div className="aspect-square w-full overflow-hidden rounded-lg">
        {thumbUrl ? (
          <div className="bg-sidebar-accent/50 relative h-full w-full">
            <img
              src={thumbUrl}
              alt={node.name}
              loading="lazy"
              draggable={false}
              onLoad={() => {
                loadedThumbnails.add(thumbUrl)
                setThumbLoaded(true)
              }}
              className={cn(
                "h-full w-full object-cover transition-opacity",
                thumbLoaded ? "opacity-100" : "opacity-0",
              )}
            />
            {!thumbLoaded ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Spinner />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FileIcon node={node} className="size-20" />
          </div>
        )}
      </div>

      <div className="flex w-full flex-col items-center gap-0.5">
        <span
          className={cn(
            "w-full truncate rounded px-1.5 text-center text-sm",
            selected && "bg-primary text-primary-foreground",
          )}
        >
          {node.name}
        </span>
        <span className="text-muted-foreground text-xs">
          {isFolder ? t("nodeCard.folder") : formatBytes(node.sizeBytes ?? 0)}
        </span>
      </div>
    </div>
  )
}

export default NodeCard
