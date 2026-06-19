"use client"

import { dateLocale } from "@workspace/i18n/format"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { AppLink as Link } from "@workspace/screens/platform"
import { authClient } from "@lib/authClient"
import { type DocMeta } from "@workspace/core/docs"
import { renameDriveNode } from "@workspace/core/drive"
import { encryptNameWith } from "@workspace/core/e2e"
import { Icon } from "@lib/icons"
import type { RelayProvider } from "@lib/yjsProvider"
import { UserPlus } from "@phosphor-icons/react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import EncryptedBadge from "@components/EncryptedBadge/EncryptedBadge"
import ShareDocDialog from "@pages/Docs/components/ShareDocDialog/ShareDocDialog"
import SheetMenuBar from "@pages/Sheets/components/SheetMenuBar/SheetMenuBar"
import type { SheetController } from "@pages/Sheets/useSheet"

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"]
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

interface SheetTopBarProps {
  nodeId: string
  doc: DocMeta
  provider: RelayProvider
  encrypted: boolean
  saveState: "saved" | "saving" | "dirty"
  lastSavedAt: number | null
  onSave: () => void
  contentKey?: Uint8Array | null
  sheet: SheetController
}

/** The fullscreen spreadsheet chrome: title, presence, save status, sharing, and the menu bar. */
const SheetTopBar = ({
  nodeId,
  doc,
  provider,
  encrypted,
  saveState,
  lastSavedAt,
  onSave,
  contentKey,
  sheet,
}: SheetTopBarProps) => {
  const { t } = useTranslation("sheets")
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()
  const [title, setTitle] = useState(doc.name)
  const [peers, setPeers] = useState<Peer[]>([])
  const [shareOpen, setShareOpen] = useState(false)

  useEffect(() => {
    document.title = title ? t("sheetTopBar.documentTitle", { title }) : t("sheetTopBar.documentTitleEmpty")
  }, [title])

  useEffect(() => {
    const me: Peer = {
      name: session?.user?.name || t("sheetTopBar.anonymous"),
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
      ? t("sheetTopBar.saving")
      : lastSavedAt
        ? t("sheetTopBar.savedAt", {
            time: new Date(lastSavedAt).toLocaleTimeString(dateLocale(), { hour: "2-digit", minute: "2-digit" }),
          })
        : t("sheetTopBar.allChangesSaved")

  return (
    <header className="bg-card flex flex-col gap-0.5 border-b px-3 pt-2">
      <div className="flex items-center gap-2">
        <Link
          href="/sheets"
          aria-label={t("sheetTopBar.backToSheets")}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-emerald-600/15 text-emerald-600 dark:text-emerald-400"
        >
          <Icon name="table" className="size-5" />
        </Link>
        <div className="flex min-w-0 flex-col">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={commitTitle}
            onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
            aria-label={t("sheetTopBar.title")}
            className="h-auto w-full border-none bg-transparent px-0 py-0 text-base font-medium shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="flex-1" />
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
        {doc.owner ? (
          <Button size="sm" onClick={() => setShareOpen(true)}>
            <UserPlus className="size-4" />
            {t("sheetTopBar.share")}
          </Button>
        ) : null}
        <Button variant="outline" size="sm" disabled={saveState === "saving"} onClick={onSave}>
          {t("sheetTopBar.save")}
        </Button>
      </div>

      <SheetMenuBar sheet={sheet} title={title} />

      <ShareDocDialog nodeId={nodeId} name={doc.name} open={shareOpen} onOpenChange={setShareOpen} />
    </header>
  )
}

export default SheetTopBar
