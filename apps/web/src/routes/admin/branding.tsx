import { createFileRoute } from "@tanstack/react-router"
import Branding from "@pages/Admin/Branding"

const RouteComponent = () => <Branding />

export const Route = createFileRoute("/admin/branding")({ component: RouteComponent })

