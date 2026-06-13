"use client"

import { favoriteAssets, fetchAssets, trashAssets } from "@lib/photos"
import { Icon } from "@lib/icons"
import CollectionView from "@pages/Photos/components/CollectionView/CollectionView"
import ConfirmButton from "@components/ConfirmButton/ConfirmButton"
import EmptyState from "@components/EmptyState/EmptyState"
import { IconHeartOff } from "@tabler/icons-react"
import { Button } from "@polarhq/ui/components/button"
import { toast } from "sonner"
import { t } from "@polarhq/i18n/config"
import { useTranslation } from "react-i18next"

const run = async (action: () => Promise<unknown>, message: string, after: () => void) => {
  try {
    await action()
    toast.success(message)
    after()
  } catch {
    toast.error(t("errors:actionFailed"))
  }
}

const Favourites = () => {
  const { t } = useTranslation("photos")
  return (
    <CollectionView
      title={t("favourites.title")}
      queryKey={["photos", "favourites"]}
      fetcher={(cursor) => fetchAssets({ view: "favourites", cursor })}
      emptyText={t("favourites.emptyText")}
      emptyState={
        <EmptyState
          icon="favourites"
          title={t("favourites.emptyTitle")}
          hint={t("favourites.emptyHint")}
        />
      }
      onDeleteSelected={trashAssets}
      actions={(ids, after, deleteConfirm) => (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => run(() => favoriteAssets(ids, false), t("favourites.removed"), after)}
          >
            <IconHeartOff className="size-4" />
            {t("favourites.unfavourite")}
          </Button>
          <ConfirmButton
            icon={<Icon name="trash" className="size-4" />}
            armed={deleteConfirm.armed}
            onTrigger={deleteConfirm.trigger}
          >
            {t("favourites.trash")}
          </ConfirmButton>
        </>
      )}
    />
  )
}

export default Favourites
