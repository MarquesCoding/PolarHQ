import { createFileRoute } from "@tanstack/react-router"
import Roles from "@pages/Admin/Roles"

const RouteComponent = () => <Roles />

export const Route = createFileRoute("/admin/roles")({ component: RouteComponent })

