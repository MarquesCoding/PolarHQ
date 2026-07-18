import { useState } from "react"
import { type AdminGroup, createAdminGroup, fetchAdminGroups } from "@workspace/core/admin"
import GroupEditor from "@pages/Admin/components/GroupEditor/GroupEditor"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { CaretRight } from "@phosphor-icons/react"
import { PageSpinner } from "@components/Spinner/Spinner"
import AdminPage from "@pages/Admin/components/AdminPage/AdminPage"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

const Groups = () => {
  const { t } = useTranslation("admin")
  const queryClient = useQueryClient()
  const { data: groups, isLoading } = useQuery({
    queryKey: ["admin", "groups"],
    queryFn: fetchAdminGroups,
  })
  const [name, setName] = useState("")
  const [selected, setSelected] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: () => createAdminGroup(name.trim()),
    onSuccess: () => {
      toast.success(t("groups.groupCreated"))
      setName("")
      void queryClient.invalidateQueries({ queryKey: ["admin", "groups"] })
      void queryClient.invalidateQueries({ queryKey: ["admin", "overview"] })
    },
    onError: () => toast.error(t("groups.groupCreateError")),
  })

  const groupRow = (group: AdminGroup) => (
    <Button
      key={group.id}
      variant="ghost"
      onClick={() => setSelected(group.id)}
      className="h-auto w-full justify-start gap-3 rounded-none px-3 py-3 font-normal"
    >
      <div className="flex min-w-0 flex-1 flex-col items-start">
        <span className="w-full truncate text-left text-sm font-medium">{group.name}</span>
        {group.description ? (
          <span className="text-muted-foreground w-full truncate text-left text-xs">
            {group.description}
          </span>
        ) : null}
      </div>
      <CaretRight className="text-muted-foreground size-4 shrink-0" />
    </Button>
  )

  if (selected) {
    return <GroupEditor groupId={selected} onBack={() => setSelected(null)} />
  }

  return (
    <AdminPage
      title={t("groups.title")}
      description={t("groups.description")}
      action={
        <div className="flex items-center gap-2">
          <Input
            value={name}
            placeholder={t("groups.newGroupNamePlaceholder")}
            onChange={(event) => setName(event.target.value)}
            className="w-48"
          />
          <Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
            {t("groups.create")}
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <PageSpinner />
      ) : groups && groups.length > 0 ? (
        <div className="panel divide-border/60 divide-y overflow-hidden rounded-xl">
          {groups.map(groupRow)}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">{t("groups.empty")}</p>
      )}
    </AdminPage>
  )
}

export default Groups
