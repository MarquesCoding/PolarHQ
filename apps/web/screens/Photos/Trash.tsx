"use client"

import { deleteAssets, emptyTrash, fetchAssets, restoreAssets } from "@lib/photos"
import { t as translate } from "@lib/i18n/config"
import CollectionView from "@pages/Photos/components/CollectionView/CollectionView"
import ConfirmButton from "@components/ConfirmButton/ConfirmButton"
import EmptyState from "@components/EmptyState/EmptyState"
import { TopBarActions } from "@components/FlatShell"
import { useQueryClient } from "@tanstack/react-query"
import { ArrowCounterClockwise, Trash as TrashIcon } from "@phosphor-icons/react"
import { useTranslation } from "react-i18next"
import { Button } from "@workspace/ui/components/button"
import { toast } from "sonner"

const run = async (action: () => Promise<unknown>, message: string, after: () => void) => {
  try {
    await action()
    toast.success(message)
    after()
  } catch {
    toast.error(translate("errors:actionFailed"))
  }
}

const Trash = () => {
  const { t } = useTranslation("photos")
  const queryClient = useQueryClient()
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["photos"] })

  return (
    <>
      <TopBarActions>
        <ConfirmButton
          icon={<TrashIcon className="size-4" />}
          confirmLabel={t("trash.emptyConfirm")}
          idleVariant="destructive-solid"
          onConfirm={() => run(emptyTrash, t("trash.emptied"), refresh)}
        >
          {t("trash.empty")}
        </ConfirmButton>
      </TopBarActions>

      <CollectionView
        title={t("trash.title")}
        queryKey={["photos", "trash"]}
        fetcher={(cursor) => fetchAssets({ view: "trash", cursor })}
        emptyText={t("trash.emptyText")}
        emptyState={
          <EmptyState icon="trash" title={t("trash.emptyTitle")} hint={t("trash.emptyHint")} />
        }
        onDeleteSelected={deleteAssets}
        deleteMessage={t("trash.permanentlyDeleted")}
        actions={(ids, after, deleteConfirm) => (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => run(() => restoreAssets(ids), t("trash.restored"), after)}
            >
              <ArrowCounterClockwise className="size-4" />
              {t("trash.restore")}
            </Button>
            <ConfirmButton
              icon={<TrashIcon className="size-4" />}
              armed={deleteConfirm.armed}
              onTrigger={deleteConfirm.trigger}
            >
              {t("trash.deleteForever")}
            </ConfirmButton>
          </>
        )}
      />
    </>
  )
}

export default Trash
