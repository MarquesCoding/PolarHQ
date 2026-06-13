import { createFileRoute } from "@tanstack/react-router"
import Library from "@pages/Photos/Library"

const RouteComponent = () => <Library />

export const Route = createFileRoute("/photos/")({ component: RouteComponent })

