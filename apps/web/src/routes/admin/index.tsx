import { createFileRoute } from "@tanstack/react-router"
import Overview from "@pages/Admin/Overview"

const RouteComponent = () => <Overview />

export const Route = createFileRoute("/admin/")({ component: RouteComponent })

