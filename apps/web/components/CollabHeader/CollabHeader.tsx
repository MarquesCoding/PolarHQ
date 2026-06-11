"use client"

import { dateLocale } from "@lib/i18n/format"
import { type ReactNode, useEffect, useState } from "react"
import { authClient } from "@lib/authClient"
import { type DocMeta } from "@lib/docs"
import { renameDriveNode } from "@lib/drive"
import { encryptNameWith } from "@lib/e2e"
import type { RelayProvider } from "@lib/yjsProvider"
import { IconDeviceFloppy, IconUserPlus } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import EncryptedBadge from "@components/EncryptedBadge/EncryptedBadge"
import ShareDocDialog from "@pages/Docs/components/ShareDocDialog/ShareDocDialog"

const COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
]
const colorFor = (seed: string): string => {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return COLORS[Math.abs(hash) % COLORS.length]!
}
const initials = (name: string): string =>
  name
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?"

interface Peer {
  name: string
  color: string
}

interface CollabHeaderProps {
  nodeId: string
  doc: DocMeta
  provider: RelayProvider
  encrypted: boolean
  saveState: "saved" | "saving" | "dirty"
  lastSavedAt: number | null
  onSave: () => void
  /** The doc's content key, used to wrap the title for collaborators when renaming. */
  contentKey?: Uint8Array | null
  /** App-specific controls rendered before Share (e.g. a Present button). */
  tools?: ReactNode
}

/** Shared editor header for collaborative documents: title, presence, save status, sharing. */
const CollabHeader = ({
  nodeId,
  doc,
  provider,
  encrypted,
  saveState,
  lastSavedAt,
  onSave,
  contentKey,
  tools,
}: CollabHeaderProps) => {
  const { t } = useTranslation("common")
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()
  const [title, setTitle] = useState(doc.name)
  const [peers, setPeers] = useState<Peer[]>([])
  const [shareOpen, setShareOpen] = useState(false)

  useEffect(() => {
    const me: Peer = {
      name: session?.user?.name || t("collabHeader.anonymous"),
      color: colorFor(session?.user?.id || session?.user?.email || "anon"),
    }
    provider.awareness.setLocalStateField("user", me)
    const update = () => {
      const others: Peer[] = []
      provider.awareness.getStates().forEach((state, clientId) => {
        const user = (state as { user?: Peer }).user
        if (clientId !== provider.awareness.clientID && user?.name) others.push(user)
      })
      setPeers(others)
    }
    provider.awareness.on("change", update)
    update()
    return () => provider.awareness.off("change", update)
  }, [provider, session])

  const commitTitle = () => {
    const next = title.trim()
    if (!next || next === doc.name) {
      setTitle(doc.name)
      return
    }
    const sharedName = contentKey ? encryptNameWith(next, contentKey) : null
    void renameDriveNode(nodeId, next, sharedName).then(() =>
      queryClient.invalidateQueries({ queryKey: ["docs"] }),
    )
  }

  const status =
    saveState === "saving"
      ? t("collabHeader.saving")
      : lastSavedAt
        ? t("collabHeader.savedAt", {
            time: new Date(lastSavedAt).toLocaleTimeString(dateLocale(), { hour: "2-digit", minute: "2-digit" }),
          })
        : t("collabHeader.notSavedYet")

  return (
    <div className="mx-auto flex w-full max-w-[1180px] items-center gap-3">
      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={commitTitle}
        onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
        aria-label={t("collabHeader.title")}
        className="h-auto border-none bg-transparent px-0 text-2xl font-semibold shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
      {peers.length > 0 ? (
        <div className="flex shrink-0 -space-x-1.5">
          {peers.slice(0, 4).map((peer, index) => (
            <span
              key={`${peer.name}-${index}`}
              title={peer.name}
              style={{ backgroundColor: peer.color }}
              className="border-background flex size-6 items-center justify-center rounded-full border-2 text-[0.6rem] font-semibold text-white"
            >
              {initials(peer.name)}
            </span>
          ))}
        </div>
      ) : null}
      <span className="text-muted-foreground shrink-0 text-xs tabular-nums">{status}</span>
      {encrypted ? <EncryptedBadge /> : null}
      {tools}
      {doc.owner ? (
        <Button variant="ghost" size="sm" onClick={() => setShareOpen(true)}>
          <IconUserPlus className="size-4" />
          {t("collabHeader.share")}
        </Button>
      ) : null}
      <Button
        variant="outline"
        size="sm"
        disabled={saveState === "saving"}
        onClick={onSave}
      >
        <IconDeviceFloppy className="size-4" />
        {t("collabHeader.save")}
      </Button>

      <ShareDocDialog nodeId={nodeId} name={doc.name} open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  )
}

export default CollabHeader
