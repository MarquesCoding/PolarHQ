"use client"

import { type ReactNode, useEffect, useState } from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { type CollabDocument, useCollabDocument } from "@lib/useCollabDocument"
import { LockKey, Trash } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import { PageSpinner } from "@components/Spinner/Spinner"
import DecryptingState from "@pages/Docs/components/DecryptingState/DecryptingState"
import UnlockDialog from "@pages/Docs/components/UnlockDialog/UnlockDialog"

interface CollabBoundaryProps {
  nodeId: string
  backHref: string
  /** Rendered once the document is loaded (and decrypted). */
  render: (collab: CollabDocument) => ReactNode
}

/** Loads a collaborative document and handles loading / decrypting / locked / error states. */
const CollabBoundary = ({ nodeId, backHref, render }: CollabBoundaryProps) => {
  const { t } = useTranslation("collab")
  const collab = useCollabDocument(nodeId)
  const [unlockOpen, setUnlockOpen] = useState(false)

  useEffect(() => {
    if (collab.status === "locked") setUnlockOpen(true)
  }, [collab.status])

  if (collab.status === "error") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <p className="text-muted-foreground text-sm">{t("collabBoundary.couldNotOpen")}</p>
        <Button
          variant="secondary"
          size="sm"
          render={<Link href={backHref}>{t("collabBoundary.goBack")}</Link>}
        />
      </div>
    )
  }

  if (collab.status === "deleted") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <Trash className="text-muted-foreground size-8" />
        <p className="text-muted-foreground text-sm">
          {collab.doc
            ? t("collabBoundary.deletedNamed", { name: collab.doc.name })
            : t("collabBoundary.deleted")}
        </p>
        <Button
          variant="secondary"
          size="sm"
          render={<Link href={backHref}>{t("collabBoundary.goBack")}</Link>}
        />
      </div>
    )
  }

  if (collab.status === "locked") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <LockKey className="text-muted-foreground size-8" />
        <p className="text-muted-foreground text-sm">{t("collabBoundary.encrypted")}</p>
        <Button size="sm" onClick={() => setUnlockOpen(true)}>
          {t("collabBoundary.unlock")}
        </Button>
        <UnlockDialog open={unlockOpen} onOpenChange={setUnlockOpen} onUnlocked={collab.retry} />
      </div>
    )
  }

  if (collab.status !== "ready" || !collab.doc || !collab.provider) {
    return collab.encrypted ? <DecryptingState /> : <PageSpinner />
  }

  return <>{render(collab)}</>
}

export default CollabBoundary
