"use client"

import { useState } from "react"
import { type AdminWorkgroup, createAdminWorkgroup, fetchAdminWorkgroups } from "@lib/admin"
import WorkgroupDetailSheet from "@pages/Admin/components/WorkgroupDetailSheet/WorkgroupDetailSheet"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { PageSpinner } from "@components/Spinner/Spinner"
import AdminPage from "@pages/Admin/components/AdminPage/AdminPage"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

const Workgroups = () => {
  const { t } = useTranslation("admin")
  const queryClient = useQueryClient()
  const { data: workgroups, isLoading } = useQuery({
    queryKey: ["admin", "workgroups"],
    queryFn: fetchAdminWorkgroups,
  })
  const [name, setName] = useState("")
  const [selected, setSelected] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: () => createAdminWorkgroup(name.trim()),
    onSuccess: () => {
      toast.success(t("workgroups.created"))
      setName("")
      void queryClient.invalidateQueries({ queryKey: ["admin", "workgroups"] })
    },
    onError: () => toast.error(t("workgroups.createError")),
  })

  const row = (workgroup: AdminWorkgroup) => (
    <div key={workgroup.id} className="flex items-center gap-3 px-3 py-3">
      <Button
        variant="ghost"
        onClick={() => setSelected(workgroup.id)}
        className="-mx-1 h-auto min-w-0 flex-1 flex-col items-start gap-0 px-1 py-1 font-normal"
      >
        <span className="w-full truncate text-sm font-medium">{workgroup.name}</span>
        {workgroup.description ? (
          <span className="text-muted-foreground w-full truncate text-xs">
            {workgroup.description}
          </span>
        ) : null}
      </Button>
    </div>
  )

  return (
    <AdminPage
      title={t("workgroups.title")}
      description={t("workgroups.description")}
      action={
        <div className="flex items-center gap-2">
          <Input
            value={name}
            placeholder={t("workgroups.namePlaceholder")}
            onChange={(event) => setName(event.target.value)}
            className="w-48"
          />
          <Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
            {t("workgroups.create")}
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <PageSpinner />
      ) : workgroups && workgroups.length > 0 ? (
        <div className="panel divide-border/60 divide-y overflow-hidden rounded-xl">
          {workgroups.map(row)}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">{t("workgroups.empty")}</p>
      )}
      <WorkgroupDetailSheet
        workgroupId={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </AdminPage>
  )
}

export default Workgroups
