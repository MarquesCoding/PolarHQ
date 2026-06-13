import { createFileRoute } from "@tanstack/react-router"
import Roles from "@polarhq/interface/screens/Admin/Roles"

const RouteComponent = () => <Roles />

export const Route = createFileRoute("/admin/roles")({ component: RouteComponent })

