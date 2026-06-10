"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import Link from "next/link"
import { secretboxOpen } from "@lib/crypto"
import { type DocMeta, fetchDoc, fetchDocContent } from "@lib/docs"
import { e2eReady, getDocContentKey, isDocEncrypted, isUnlocked } from "@lib/e2e"
import { RelayProvider } from "@lib/yjsProvider"
import { IconShieldLock } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import { PageSpinner } from "@components/Spinner/Spinner"
import * as Y from "yjs"
import DecryptingState from "@pages/Docs/components/DecryptingState/DecryptingState"
import DocCanvas from "@pages/Docs/components/DocCanvas/DocCanvas"
import UnlockDialog from "@pages/Docs/components/UnlockDialog/UnlockDialog"

type Status = "loading" | "ready" | "error" | "locked"

/** Loads a document's snapshot into a Yjs doc, connects the live relay, then mounts the editor. */
const Editor = ({ nodeId }: { nodeId: string }) => {
  const { t } = useTranslation("docs")
  const [ydoc] = useState(() => new Y.Doc())
  const [provider, setProvider] = useState<RelayProvider | null>(null)
  const [doc, setDoc] = useState<DocMeta | null>(null)
  const [contentKey, setContentKey] = useState<Uint8Array | null>(null)
  const [encrypted, setEncrypted] = useState(false)
  const [status, setStatus] = useState<Status>("loading")
  const [unlockOpen, setUnlockOpen] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    let prov: RelayProvider | undefined
    void (async () => {
      try {
        await e2eReady()
        const [meta, docEncrypted] = await Promise.all([fetchDoc(nodeId), isDocEncrypted(nodeId)])
        if (cancelled) return
        setDoc(meta)
        setEncrypted(docEncrypted)

        let key: Uint8Array | null = null
        if (docEncrypted) {
          if (!isUnlocked()) {
            setStatus("locked")
            setUnlockOpen(true)
            return
          }
          key = await getDocContentKey(nodeId)
          if (cancelled) return
          if (!key) {
            setStatus("error")
            return
          }
        }

        const content = await fetchDocContent(nodeId)
        if (cancelled) return
        let bytes: Uint8Array = new Uint8Array(content)
        if (key && bytes.byteLength > 0) {
          try {
            bytes = secretboxOpen(bytes, key)
          } catch {
            setStatus("error")
            return
          }
        }
        if (bytes.byteLength > 0) Y.applyUpdate(ydoc, bytes)

        prov = new RelayProvider(nodeId, ydoc, key ?? undefined)
        setProvider(prov)
        setContentKey(key)
        setStatus("ready")
      } catch {
        if (!cancelled) setStatus("error")
      }
    })()
    return () => {
      cancelled = true
      prov?.destroy()
    }
  }, [nodeId, ydoc, reload])

  if (status === "error") {
    return (
      <div className="flex min-h-svh flex-1 flex-col items-center justify-center gap-3 text-center">
        <p className="text-muted-foreground text-sm">{t("editor.openError")}</p>
        <Button variant="secondary" size="sm" render={<Link href="/docs">{t("editor.backToDocs")}</Link>} />
      </div>
    )
  }

  if (status === "locked") {
    return (
      <div className="flex min-h-svh flex-1 flex-col items-center justify-center gap-3 text-center">
        <IconShieldLock className="text-muted-foreground size-8" />
        <p className="text-muted-foreground text-sm">{t("editor.encrypted")}</p>
        <Button size="sm" onClick={() => setUnlockOpen(true)}>
          {t("editor.unlock")}
        </Button>
        <UnlockDialog
          open={unlockOpen}
          onOpenChange={setUnlockOpen}
          onUnlocked={() => {
            setStatus("loading")
            setReload((value) => value + 1)
          }}
        />
      </div>
    )
  }

  if (status !== "ready" || !doc || !provider) {
    return encrypted ? <DecryptingState /> : <PageSpinner />
  }

  return (
    <DocCanvas nodeId={nodeId} ydoc={ydoc} doc={doc} provider={provider} contentKey={contentKey} />
  )
}

export default Editor
