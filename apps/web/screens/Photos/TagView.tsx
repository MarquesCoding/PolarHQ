"use client"

import { favoriteAssets, fetchAssets, fetchTags, trashAssets } from "@lib/photos"
import { Icon } from "@lib/icons"
import CollectionView from "@pages/Photos/components/CollectionView/CollectionView"
import ConfirmButton from "@components/ConfirmButton/ConfirmButton"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { toast } from "sonner"

const run = async (action: () => Promise<unknown>, message: string, after: () => void) => {
  try {
    await action()
    toast.success(message)
    after()
  } catch {
    toast.error("Action failed")
  }
}

interface TagViewProps {
  tagId: string
}

const TagView = ({ tagId }: TagViewProps) => {
  const { data: tags } = useQuery({ queryKey: ["photos", "tags"], queryFn: fetchTags })
  const name = tags?.find((tag) => tag.id === tagId)?.name ?? "Tag"

  return (
    <CollectionView
      title={`#${name}`}
      queryKey={["photos", "tag", tagId]}
      fetcher={(cursor) => fetchAssets({ tag: tagId, cursor })}
      emptyText="No photos with this tag yet."
      onDeleteSelected={trashAssets}
      actions={(ids, after, deleteConfirm) => (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => run(() => favoriteAssets(ids, true), "Added to favourites", after)}
          >
            <Icon name="favourites" className="size-4" />
            Favourite
          </Button>
          <ConfirmButton
            icon={<Icon name="trash" className="size-4" />}
            armed={deleteConfirm.armed}
            onTrigger={deleteConfirm.trigger}
          >
            Trash
          </ConfirmButton>
        </>
      )}
    />
  )
}

export default TagView
