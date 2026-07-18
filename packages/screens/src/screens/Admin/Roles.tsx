import { useState } from "react"
import { type AdminRole, fetchAdminRoles } from "@workspace/core/admin"
import RoleEditor from "@pages/Admin/components/RoleEditor/RoleEditor"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { PageSpinner } from "@components/Spinner/Spinner"
import AdminPage from "@pages/Admin/components/AdminPage/AdminPage"
import { useTranslation } from "react-i18next"

type Editing = { role: AdminRole | null } | null

const Roles = () => {
  const { t } = useTranslation("admin")
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Editing>(null)
  const { data: roles, isLoading } = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: fetchAdminRoles,
  })
  const onSaved = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "roles"] })
    void queryClient.invalidateQueries({ queryKey: ["admin", "overview"] })
  }

  const roleRow = (role: AdminRole) => (
    <div key={role.id} className="flex items-center gap-3 px-3 py-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-2 text-sm font-medium">
          {role.name}
          {role.isSystem ? <Badge variant="secondary">{t("roles.system")}</Badge> : null}
        </span>
        {role.description ? (
          <span className="text-muted-foreground truncate text-xs">{role.description}</span>
        ) : null}
      </div>
      {!role.isSystem ? (
        <Button variant="ghost" size="sm" onClick={() => setEditing({ role })}>
          {t("roles.edit")}
        </Button>
      ) : null}
    </div>
  )

  if (editing) {
    return <RoleEditor role={editing.role} onBack={() => setEditing(null)} onSaved={onSaved} />
  }

  return (
    <AdminPage
      title={t("roles.title")}
      description={t("roles.description")}
      action={
        <Button onClick={() => setEditing({ role: null })}>{t("createRoleDialog.newRole")}</Button>
      }
    >
      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="panel divide-border/60 divide-y overflow-hidden rounded-xl">
          {(roles ?? []).map(roleRow)}
        </div>
      )}
    </AdminPage>
  )
}

export default Roles
