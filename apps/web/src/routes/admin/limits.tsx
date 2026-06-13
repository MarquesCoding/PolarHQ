import { createFileRoute } from "@tanstack/react-router"
import Limits from "@pages/Admin/Limits"

const RouteComponent = () => <Limits />

export const Route = createFileRoute("/admin/limits")({ component: RouteComponent })

