import { favoriteAssets, fetchAssets, fetchTags, trashAssets } from "@workspace/core/photos"
import { Icon } from "@workspace/screens/icons"
import CollectionView from "@pages/Photos/components/CollectionView/CollectionView"
import ConfirmButton from "@components/ConfirmButton/ConfirmButton"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { toast } from "sonner"
import { photoNotice } from "./workspace/notice"
import { useTranslation } from "react-i18next"
import { t } from "@workspace/i18n/config"

const run = async (action: () => Promise<unknown>, message: string, after: () => void) => {
  try {
    await action()
    photoNotice(message)
    after()
  } catch {
    toast.error(t("errors:actionFailed"))
  }
}

interface TagViewProps {
  tagId: string
}

const TagView = ({ tagId }: TagViewProps) => {
  const { t } = useTranslation("photos")
  const { data: tags } = useQuery({ queryKey: ["photos", "tags"], queryFn: fetchTags })
  const name = tags?.find((tag) => tag.id === tagId)?.name ?? t("tagView.tag")

  return (
    <CollectionView
      title={`#${name}`}
      queryKey={["photos", "tag", tagId]}
      fetcher={(cursor) => fetchAssets({ tag: tagId, cursor })}
      emptyText={t("tagView.emptyText")}
      onDeleteSelected={trashAssets}
      actions={(ids, after, deleteConfirm, allFavourited) => (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              run(
                () => favoriteAssets(ids, !allFavourited),
                allFavourited
                  ? t("favourites.removed", { defaultValue: "Removed from favourites" })
                  : t("tagView.addedToFavourites"),
                after,
              )
            }
          >
            <Icon name="favourites" className="size-4" />
            {allFavourited ? t("tagView.unfavourite", { defaultValue: "Unfavourite" }) : t("tagView.favourite")}
          </Button>
          <ConfirmButton
            icon={<Icon name="trash" className="size-4" />}
            armed={deleteConfirm.armed}
            onTrigger={deleteConfirm.trigger}
          >
            {t("tagView.trash")}
          </ConfirmButton>
        </>
      )}
    />
  )
}

export default TagView
