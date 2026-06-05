"use client"

import { type ReactNode, useEffect, useState } from "react"
import type { ShareLink, ShareOptions } from "@lib/drive"
import { Icon } from "@lib/icons"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Switch } from "@workspace/ui/components/switch"
import { toast } from "sonner"

interface ShareDialogProps {
  name: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  createLink: (options: ShareOptions) => Promise<ShareLink>
}

const EXPIRY_OPTIONS = [
  { value: "1", label: "1 hour" },
  { value: "24", label: "1 day" },
  { value: "168", label: "7 days" },
  { value: "720", label: "30 days" },
]

const Row = ({ label, hint, control }: { label: string; hint?: string; control: ReactNode }) => (
  <div className="flex items-center justify-between gap-3">
    <div className="min-w-0">
      <p className="text-sm">{label}</p>
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
    {control}
  </div>
)

/** Shared share-link dialog: direct/expiry/limit switches; works for any shareable resource. */
const ShareDialog = ({ name, open, onOpenChange, createLink }: ShareDialogProps) => {
  const [direct, setDirect] = useState(false)
  const [permanent, setPermanent] = useState(true)
  const [expiryHours, setExpiryHours] = useState("24")
  const [limitEnabled, setLimitEnabled] = useState(false)
  const [maxDownloads, setMaxDownloads] = useState(1)
  const [link, setLink] = useState<ShareLink | null>(null)

  const save = useMutation({
    mutationFn: () =>
      createLink({
        expiresInHours: permanent ? null : Number(expiryHours),
        maxDownloads: limitEnabled ? maxDownloads : null,
      }),
    onSuccess: (data) => setLink(data),
  })

  useEffect(() => {
    if (open) save.mutate()
    else setLink(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, name, permanent, expiryHours, limitEnabled, maxDownloads])

  const fullUrl = link ? `${link.url}${direct ? "?direct=true" : ""}` : ""
  const copy = () => {
    if (!link) return
    void navigator.clipboard.writeText(fullUrl)
    toast.success("Link copied")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="truncate pe-2">Share “{name}”</DialogTitle>
          <DialogDescription>Anyone with this link can download the file.</DialogDescription>
        </DialogHeader>

        <Input
          readOnly
          value={link ? fullUrl : "Generating link…"}
          onFocus={(event) => event.target.select()}
        />

        <div className="flex flex-col gap-3">
          <Row
            label="Direct download"
            hint="Skip the landing page and download immediately"
            control={<Switch checked={direct} onCheckedChange={setDirect} />}
          />
          <Row
            label="Permanent link"
            hint="Keep this link active until you delete it"
            control={<Switch checked={permanent} onCheckedChange={setPermanent} />}
          />
          {!permanent ? (
            <Row
              label="Expires after"
              control={
                <Select value={expiryHours} onValueChange={(value) => setExpiryHours(value ?? "24")}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
          ) : null}
          <Row
            label="Limit downloads"
            hint="Disable the link after a number of downloads"
            control={<Switch checked={limitEnabled} onCheckedChange={setLimitEnabled} />}
          />
          {limitEnabled ? (
            <Row
              label="Maximum downloads"
              control={
                <Input
                  type="number"
                  min={1}
                  value={maxDownloads}
                  onChange={(event) => setMaxDownloads(Math.max(1, Number(event.target.value) || 1))}
                  className="w-24"
                />
              }
            />
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={copy} disabled={!link}>
            <Icon name="duplicate" className="size-4" />
            Copy link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ShareDialog
