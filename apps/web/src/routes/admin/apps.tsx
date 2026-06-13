import { createFileRoute } from "@tanstack/react-router"
import Apps from "@pages/Admin/Apps"

const RouteComponent = () => <Apps />

export const Route = createFileRoute("/admin/apps")({ component: RouteComponent })

