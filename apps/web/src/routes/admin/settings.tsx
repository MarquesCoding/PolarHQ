import { createFileRoute } from "@tanstack/react-router"
import Settings from "@polarhq/interface/screens/Admin/Settings"

const RouteComponent = () => <Settings />

export const Route = createFileRoute("/admin/settings")({ component: RouteComponent })

