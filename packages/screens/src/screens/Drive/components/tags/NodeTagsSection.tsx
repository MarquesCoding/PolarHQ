import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { DriveNode } from "@workspace/core/drive"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Check, Plus, X } from "@phosphor-icons/react"
import { useNodeTags } from "./useNodeTags"
import TagCreateDialog from "./TagCreateDialog"

/** Tag chips for a node plus an add/create control — the details-panel tag surface. */
const NodeTagsSection = ({ node }: { node: DriveNode }) => {
  const { t } = useTranslation("drive")
  const [dialog, setDialog] = useState(false)
  const { allTags, applied, toggle, create } = useNodeTags(node)
  const nodeTags = node.tags ?? []

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {nodeTags.map((tag) => (
          <span
            key={tag.id}
            className="border-border/60 inline-flex items-center gap-1.5 rounded-full border py-0.5 pr-1 pl-2 text-xs"
          >
            <span className="size-2 rounded-full" style={{ backgroundColor: tag.color }} />
            {tag.name}
            <button
              type="button"
              aria-label={t("tags.remove", { defaultValue: "Remove" })}
              onClick={() => void toggle(tag)}
              className="text-muted-foreground hover:text-foreground flex size-4 items-center justify-center rounded-full"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="h-6 gap-1 rounded-full px-2 text-xs"
              />
            }
          >
            <Plus className="size-3.5" />
            {t("tags.add", { defaultValue: "Add" })}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {allTags.map((tag) => (
              <DropdownMenuItem
                key={tag.id}
                closeOnClick={false}
                onClick={() => void toggle(tag)}
              >
                <span className="size-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                <span className="flex-1 truncate">{tag.name}</span>
                {applied.has(tag.id) ? <Check className="size-3.5" /> : null}
              </DropdownMenuItem>
            ))}
            {allTags.length > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem onClick={() => setDialog(true)}>
              <Plus />
              {t("tags.newTag", { defaultValue: "New tag" })}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <TagCreateDialog open={dialog} onOpenChange={setDialog} onCreate={create} />
    </>
  )
}

export default NodeTagsSection
