import { createFileRoute } from "@tanstack/react-router"
import Audit from "@polarhq/interface/screens/Admin/Audit"

const RouteComponent = () => <Audit />

export const Route = createFileRoute("/admin/audit")({ component: RouteComponent })

