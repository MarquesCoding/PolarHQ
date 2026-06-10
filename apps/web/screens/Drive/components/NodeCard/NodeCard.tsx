"use client"

import { type MouseEvent, useEffect, useRef, useState } from "react"
import type { DriveNode } from "@lib/drive"
import { fetchDecryptedThumbnail } from "@lib/driveE2e"
import { formatBytes } from "@lib/format"
import { Icon } from "@lib/icons"
import { IconCircle, IconCircleCheckFilled } from "@tabler/icons-react"
import { cn } from "@workspace/ui/lib/utils"
import Spinner from "@components/Spinner/Spinner"

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

const ARCHIVE = /\.(zip|tar|gz|tgz|rar|7z|bz2|xz|dmg)$/i
const DATABASE = /\.(db|sqlite|sqlite3|sql)$/i
const TEXTUAL = /\.(txt|md|json|js|ts|tsx|jsx|css|html|ya?ml|csv|sh)$/i

const typeIcon = (node: DriveNode): { name: string; color: string } => {
  const name = node.name.toLowerCase()
  const mime = node.mimeType ?? ""
  if (mime === "application/vnd.orbit.doc")
    return { name: "document", color: "text-muted-foreground" }
  if (mime === "application/vnd.orbit.sheet")
    return { name: "table", color: "text-muted-foreground" }
  if (/\.(xlsx|xls|csv|tsv|ods)$/i.test(name)) return { name: "table", color: "text-emerald-500" }
  if (/\.docx$/i.test(name)) return { name: "document", color: "text-blue-500" }
  if (/\.pptx$/i.test(name)) return { name: "presentation", color: "text-amber-500" }
  if (mime.startsWith("audio/")) return { name: "music", color: "text-emerald-400" }
  if (mime.startsWith("video/")) return { name: "video", color: "text-rose-400" }
  if (mime === "application/pdf" || name.endsWith(".pdf"))
    return { name: "file-pdf", color: "text-red-400" }
  if (ARCHIVE.test(name)) return { name: "file-zip", color: "text-muted-foreground" }
  if (DATABASE.test(name)) return { name: "database", color: "text-violet-400" }
  if (mime.startsWith("image/")) return { name: "photo", color: "text-sky-400" }
  if (mime.startsWith("text/") || TEXTUAL.test(name))
    return { name: "file-text", color: "text-muted-foreground" }
  return { name: "file-text", color: "text-muted-foreground" }
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
  const isFolder = node.kind === "folder"
  const canDrop = isFolder && Boolean(onDropNodes)
  const [over, setOver] = useState(false)
  const [blink, setBlink] = useState(false)
  const [thumbLoaded, setThumbLoaded] = useState(() =>
    node.thumbnailUrl ? loadedThumbnails.has(node.thumbnailUrl) : false,
  )
  const [decryptedThumb, setDecryptedThumb] = useState<string | null>(null)
  const type = typeIcon(node)
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
        selected ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/40",
        over && "ring-primary ring-2",
        blink && "ring-primary animate-pulse ring-4",
      )}
    >
      <button
        type="button"
        aria-label={selected ? "Deselect" : "Select"}
        onClick={(event) => {
          event.stopPropagation()
          onToggle(node)
        }}
        className={cn(
          "absolute top-1 left-1 z-10 flex size-6 items-center justify-center rounded-full transition",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        {selected ? (
          <IconCircleCheckFilled className="text-primary bg-background size-5 rounded-full" />
        ) : (
          <IconCircle className="text-muted-foreground bg-background/70 size-5 rounded-full" />
        )}
      </button>

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
            {isFolder ? (
              <Icon
                name={node.special ? "folder-shield" : node.locked ? "folder-key" : "folder"}
                className="size-16 text-blue-400"
              />
            ) : (
              <Icon name={type.name} className={cn("size-14", type.color)} />
            )}
          </div>
        )}
      </div>

      <div className="flex w-full flex-col items-center gap-0.5">
        <span
          className={cn(
            "max-w-full truncate rounded px-1.5 text-sm",
            selected && "bg-primary text-primary-foreground",
          )}
        >
          {node.name}
        </span>
        <span className="text-muted-foreground text-xs">
          {isFolder ? "Folder" : formatBytes(node.sizeBytes ?? 0)}
        </span>
      </div>
    </div>
  )
}

export default NodeCard
