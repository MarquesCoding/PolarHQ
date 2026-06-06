"use client"

import { useState } from "react"
import { type AdminLimit, fetchAdminLimits, setInstanceLimit } from "@lib/admin"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { PageSpinner } from "@components/Spinner/Spinner"
import AdminPage from "@pages/Admin/components/AdminPage/AdminPage"
import { toast } from "sonner"

const MB = 1024 * 1024

const toDisplay = (limit: AdminLimit): string =>
  limit.value == null ? "" : String(Math.round(Number(limit.value) / MB))

const LimitRow = ({ limit, onSaved }: { limit: AdminLimit; onSaved: () => void }) => {
  const [draft, setDraft] = useState(() => toDisplay(limit))
  const save = useMutation({
    mutationFn: () => {
      const trimmed = draft.trim()
      const value = trimmed === "" ? null : Math.round(Number(trimmed) * MB)
      return setInstanceLimit(limit.key, value)
    },
    onSuccess: () => {
      toast.success(`${limit.label} saved`)
      onSaved()
    },
    onError: () => toast.error("Could not save the limit"),
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
          placeholder="Unlimited"
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
          Save
        </Button>
      </div>
    </div>
  )
}

const Limits = () => {
  const queryClient = useQueryClient()
  const { data: limits, isLoading } = useQuery({
    queryKey: ["admin", "limits"],
    queryFn: fetchAdminLimits,
  })
  const onSaved = () => void queryClient.invalidateQueries({ queryKey: ["admin", "limits"] })

  return (
    <AdminPage
      title="Limits"
      description="Instance-wide defaults. Leave blank for unlimited; per-user and group overrides take precedence."
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
