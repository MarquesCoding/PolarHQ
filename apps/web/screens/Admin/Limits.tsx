"use client"

import { useState } from "react"
import { type AdminLimit, fetchAdminLimits, setInstanceLimit } from "@lib/admin"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@polarhq/ui/components/button"
import { Input } from "@polarhq/ui/components/input"
import { PageSpinner } from "@components/Spinner/Spinner"
import AdminPage from "@pages/Admin/components/AdminPage/AdminPage"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

const MB = 1024 * 1024

const toDisplay = (limit: AdminLimit): string =>
  limit.value == null ? "" : String(Math.round(Number(limit.value) / MB))

const LimitRow = ({ limit, onSaved }: { limit: AdminLimit; onSaved: () => void }) => {
  const { t } = useTranslation("admin")
  const [draft, setDraft] = useState(() => toDisplay(limit))
  const save = useMutation({
    mutationFn: () => {
      const trimmed = draft.trim()
      const value = trimmed === "" ? null : Math.round(Number(trimmed) * MB)
      return setInstanceLimit(limit.key, value)
    },
    onSuccess: () => {
      toast.success(t("limitRow.saved", { label: limit.label }))
      onSaved()
    },
    onError: () => toast.error(t("limitRow.saveError")),
  })

  return (
    <div className="flex items-center gap-4 px-3 py-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium">{limit.label}</span>
        <span className="text-muted-foreground truncate text-xs">{limit.description}</span>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          value={draft}
          placeholder={t("limitRow.unlimitedPlaceholder")}
          onChange={(event) => setDraft(event.target.value)}
          className="w-28"
        />
        <span className="text-muted-foreground w-8 text-xs">MB</span>
        <Button
          size="sm"
          variant="secondary"
          disabled={save.isPending || draft === toDisplay(limit)}
          onClick={() => save.mutate()}
        >
          {t("limitRow.save")}
        </Button>
      </div>
    </div>
  )
}

const Limits = () => {
  const { t } = useTranslation("admin")
  const queryClient = useQueryClient()
  const { data: limits, isLoading } = useQuery({
    queryKey: ["admin", "limits"],
    queryFn: fetchAdminLimits,
  })
  const onSaved = () => void queryClient.invalidateQueries({ queryKey: ["admin", "limits"] })

  return (
    <AdminPage
      title={t("limits.title")}
      description={t("limits.description")}
    >
      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="panel divide-border/60 divide-y overflow-hidden rounded-xl">
          {(limits ?? []).map((limit) => (
            <LimitRow key={limit.key} limit={limit} onSaved={onSaved} />
          ))}
        </div>
      )}
    </AdminPage>
  )
}

export default Limits
