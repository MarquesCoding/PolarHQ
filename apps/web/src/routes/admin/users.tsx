import { createFileRoute } from "@tanstack/react-router"
import Users from "@polarhq/interface/screens/Admin/Users"

const RouteComponent = () => <Users />

export const Route = createFileRoute("/admin/users")({ component: RouteComponent })

