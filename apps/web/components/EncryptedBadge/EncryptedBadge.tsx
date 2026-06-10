"use client"

import { IconShieldLock } from "@tabler/icons-react"
import { Badge } from "@workspace/ui/components/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip"
import { useTranslation } from "react-i18next"

interface EncryptedBadgeProps {
  description?: string
}

/** The "Encrypted" badge with a popover explaining end-to-end encryption. Used across the
 *  collaborative editors (Sheets, Docs). */
const EncryptedBadge = ({ description }: EncryptedBadgeProps) => {
  const { t } = useTranslation("common")
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge
            variant="secondary"
            className="shrink-0 cursor-default gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          >
            <IconShieldLock />
            {t("encryptedBadge.encrypted")}
          </Badge>
        }
      />
      <TooltipContent className="bg-popover text-popover-foreground border-border flex max-w-xs flex-col items-start gap-0 rounded-xl border p-4 text-sm shadow-lg">
        <span className="text-foreground flex items-center gap-2 font-semibold">
          <IconShieldLock className="size-4 text-emerald-600 dark:text-emerald-400" />
          {t("encryptedBadge.endToEndEncrypted")}
        </span>
        <span className="text-muted-foreground mt-1.5 leading-snug">
          {description ?? t("encryptedBadge.defaultDescription")}
        </span>
      </TooltipContent>
    </Tooltip>
  )
}

export default EncryptedBadge
