import { useState } from "react"
import {
  type LimitSubject,
  type LimitValue,
  clearLimitFor,
  setLimitFor,
} from "@workspace/core/admin"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

const MB = 1024 * 1024

interface LimitLike {
  key: string
  label: string
  hasOverride: boolean
  override: LimitValue
}

const overrideDisplay = (limit: LimitLike): string =>
  limit.hasOverride && limit.override != null ? String(Math.round(Number(limit.override) / MB)) : ""

interface LimitOverrideRowProps {
  subjectType: LimitSubject
  subjectId: string
  limit: LimitLike
  inherited: string
  onChanged: () => void
}

/** One inherited-vs-override storage limit, shared by the user and group inline editors. */
const LimitOverrideRow = ({
  subjectType,
  subjectId,
  limit,
  inherited,
  onChanged,
}: LimitOverrideRowProps) => {
  const { t } = useTranslation("admin")
  const [draft, setDraft] = useState(() => overrideDisplay(limit))

  const save = useMutation({
    mutationFn: () => {
      const trimmed = draft.trim()
      const value = trimmed === "" ? null : Math.round(Number(trimmed) * MB)
      return setLimitFor(subjectType, subjectId, limit.key, value)
    },
    onSuccess: () => {
      toast.success(t("limitOverrideRow.overrideSaved", { label: limit.label }))
      onChanged()
    },
    onError: () => toast.error(t("limitOverrideRow.saveError")),
  })

  const clear = useMutation({
    mutationFn: () => clearLimitFor(subjectType, subjectId, limit.key),
    onSuccess: () => {
      toast.success(t("limitOverrideRow.overrideRemoved"))
      setDraft("")
      onChanged()
    },
    onError: () => toast.error(t("limitOverrideRow.clearError")),
  })

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{limit.label}</span>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          value={draft}
          placeholder={t("limitOverrideRow.inheritedPlaceholder", { inherited })}
          onChange={(event) => setDraft(event.target.value)}
          className="w-32"
        />
        <span className="text-muted-foreground text-xs">MB</span>
        <Button
          size="sm"
          variant="secondary"
          disabled={save.isPending || draft === overrideDisplay(limit)}
          onClick={() => save.mutate()}
        >
          {t("limitOverrideRow.save")}
        </Button>
        {limit.hasOverride ? (
          <Button size="sm" variant="ghost" disabled={clear.isPending} onClick={() => clear.mutate()}>
            {t("limitOverrideRow.reset")}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export default LimitOverrideRow
