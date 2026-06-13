import { createFileRoute } from "@tanstack/react-router"
import Branding from "@polarhq/interface/screens/Admin/Branding"

const RouteComponent = () => <Branding />

export const Route = createFileRoute("/admin/branding")({ component: RouteComponent })

