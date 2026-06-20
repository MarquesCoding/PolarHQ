import { type ReactNode, useEffect, useState } from "react"
import { toB64 } from "@workspace/core/crypto"
import type { ShareLink, ShareOptions } from "@workspace/core/drive"
import { getDocContentKey } from "@workspace/core/e2e"
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
import { useTranslation } from "react-i18next"

interface ShareDialogProps {
  name: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  createLink: (options: ShareOptions) => Promise<ShareLink>
  encryptKeyId?: string
}

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
const ShareDialog = ({
  name,
  open,
  onOpenChange,
  createLink,
  encryptKeyId,
}: ShareDialogProps) => {
  const { t } = useTranslation("common")
  const EXPIRY_OPTIONS = [
    { value: "1", label: t("shareDialog.expiry1Hour") },
    { value: "24", label: t("shareDialog.expiry1Day") },
    { value: "168", label: t("shareDialog.expiry7Days") },
    { value: "720", label: t("shareDialog.expiry30Days") },
  ]
  const [direct, setDirect] = useState(false)
  const [permanent, setPermanent] = useState(true)
  const [expiryHours, setExpiryHours] = useState("24")
  const [limitEnabled, setLimitEnabled] = useState(false)
  const [maxDownloads, setMaxDownloads] = useState(1)
  const [link, setLink] = useState<ShareLink | null>(null)
  const [keyFragment, setKeyFragment] = useState<string | null>(null)

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

  useEffect(() => {
    if (!open || !encryptKeyId) {
      setKeyFragment(null)
      return
    }
    let active = true
    void getDocContentKey(encryptKeyId).then((key) => {
      if (!active) return
      const namePart = name ? `&n=${encodeURIComponent(name)}` : ""
      setKeyFragment(key ? `#k=${encodeURIComponent(toB64(key))}${namePart}` : null)
    })
    return () => {
      active = false
    }
  }, [open, encryptKeyId, name])

  const encrypted = Boolean(keyFragment)
  const fullUrl = link
    ? encrypted
      ? `${link.url}${keyFragment}`
      : `${link.url}${direct ? "?direct=true" : ""}`
    : ""
  const copy = () => {
    if (!link) return
    void navigator.clipboard.writeText(fullUrl)
    toast.success(t("shareDialog.linkCopied"))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader className="min-w-0">
          <DialogTitle className="min-w-0 truncate pe-2">
            {t("shareDialog.title", { name })}
          </DialogTitle>
          <DialogDescription>
            {encrypted
              ? t("shareDialog.descriptionEncrypted")
              : t("shareDialog.descriptionPublic")}
          </DialogDescription>
        </DialogHeader>

        <Input
          readOnly
          value={link ? fullUrl : t("shareDialog.generatingLink")}
          onFocus={(event) => event.target.select()}
        />

        <div className="flex flex-col gap-3">
          {encrypted ? null : (
            <Row
              label={t("shareDialog.directDownload")}
              hint={t("shareDialog.directDownloadHint")}
              control={<Switch checked={direct} onCheckedChange={setDirect} />}
            />
          )}
          <Row
            label={t("shareDialog.permanentLink")}
            hint={t("shareDialog.permanentLinkHint")}
            control={<Switch checked={permanent} onCheckedChange={setPermanent} />}
          />
          {!permanent ? (
            <Row
              label={t("shareDialog.expiresAfter")}
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
            label={t("shareDialog.limitDownloads")}
            hint={t("shareDialog.limitDownloadsHint")}
            control={<Switch checked={limitEnabled} onCheckedChange={setLimitEnabled} />}
          />
          {limitEnabled ? (
            <Row
              label={t("shareDialog.maximumDownloads")}
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
            {t("shareDialog.cancel")}
          </Button>
          <Button onClick={copy} disabled={!link}>
            <Icon name="duplicate" className="size-4" />
            {t("shareDialog.copyLink")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ShareDialog
