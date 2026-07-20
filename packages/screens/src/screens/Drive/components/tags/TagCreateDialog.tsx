import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { TAG_COLORS } from "./useNodeTags"

interface TagCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string, color: string) => void | Promise<void>
}

const TagCreateDialog = ({ open, onOpenChange, onCreate }: TagCreateDialogProps) => {
  const { t } = useTranslation("drive")
  const [name, setName] = useState("")
  const [color, setColor] = useState(TAG_COLORS[0]!)

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    await onCreate(trimmed, color)
    setName("")
    setColor(TAG_COLORS[0]!)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>{t("tags.newTag", { defaultValue: "New tag" })}</DialogTitle>
        </DialogHeader>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("tags.namePlaceholder", { defaultValue: "Tag name" })}
          autoFocus
          onKeyDown={(event) => event.key === "Enter" && void submit()}
        />
        <div className="flex items-center gap-2 pt-1">
          {TAG_COLORS.map((swatch) => (
            <button
              key={swatch}
              type="button"
              aria-label={swatch}
              onClick={() => setColor(swatch)}
              style={{ backgroundColor: swatch }}
              className={cn(
                "ring-offset-background size-6 rounded-full transition",
                color === swatch ? "ring-foreground ring-2 ring-offset-2" : "hover:scale-110",
              )}
            />
          ))}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            {t("tags.cancel", { defaultValue: "Cancel" })}
          </DialogClose>
          <Button onClick={() => void submit()} disabled={!name.trim()}>
            {t("tags.create", { defaultValue: "Create" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TagCreateDialog
