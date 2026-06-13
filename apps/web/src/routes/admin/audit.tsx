import { createFileRoute } from "@tanstack/react-router"
import Audit from "@pages/Admin/Audit"

const RouteComponent = () => <Audit />

export const Route = createFileRoute("/admin/audit")({ component: RouteComponent })

