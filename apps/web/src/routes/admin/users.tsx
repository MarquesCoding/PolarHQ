import { createFileRoute } from "@tanstack/react-router"
import Users from "@pages/Admin/Users"

const RouteComponent = () => <Users />

export const Route = createFileRoute("/admin/users")({ component: RouteComponent })

