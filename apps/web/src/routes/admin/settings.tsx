import { createFileRoute } from "@tanstack/react-router"
import Settings from "@pages/Admin/Settings"

const RouteComponent = () => <Settings />

export const Route = createFileRoute("/admin/settings")({ component: RouteComponent })

