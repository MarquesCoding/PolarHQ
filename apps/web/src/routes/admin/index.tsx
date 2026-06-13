import { createFileRoute } from "@tanstack/react-router"
import Overview from "@polarhq/interface/screens/Admin/Overview"

const RouteComponent = () => <Overview />

export const Route = createFileRoute("/admin/")({ component: RouteComponent })

