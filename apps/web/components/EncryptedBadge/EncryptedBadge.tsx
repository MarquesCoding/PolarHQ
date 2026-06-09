"use client"

import { IconShieldLock } from "@tabler/icons-react"
import { Badge } from "@workspace/ui/components/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip"

interface EncryptedBadgeProps {
  description?: string
}

/** The "Encrypted" badge with a popover explaining end-to-end encryption. Used across the
 *  collaborative editors (Sheets, Docs, Slides). */
const EncryptedBadge = ({
  description = "Every change you make is automatically and securely saved to Drive.",
}: EncryptedBadgeProps) => (
  <Tooltip>
    <TooltipTrigger
      render={
        <Badge
          variant="secondary"
          className="shrink-0 cursor-default gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        >
          <IconShieldLock />
          Encrypted
        </Badge>
      }
    />
    <TooltipContent className="bg-popover text-popover-foreground border-border flex max-w-xs flex-col items-start gap-0 rounded-xl border p-4 text-sm shadow-lg">
      <span className="text-foreground flex items-center gap-2 font-semibold">
        <IconShieldLock className="size-4 text-emerald-600 dark:text-emerald-400" />
        End-to-end encrypted
      </span>
      <span className="text-muted-foreground mt-1.5 leading-snug">{description}</span>
    </TooltipContent>
  </Tooltip>
)

export default EncryptedBadge
