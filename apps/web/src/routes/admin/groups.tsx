import { createFileRoute } from "@tanstack/react-router"
import Groups from "@polarhq/interface/screens/Admin/Groups"

const RouteComponent = () => <Groups />

export const Route = createFileRoute("/admin/groups")({ component: RouteComponent })

