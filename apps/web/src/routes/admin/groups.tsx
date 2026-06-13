import { createFileRoute } from "@tanstack/react-router"
import Groups from "@pages/Admin/Groups"

const RouteComponent = () => <Groups />

export const Route = createFileRoute("/admin/groups")({ component: RouteComponent })

