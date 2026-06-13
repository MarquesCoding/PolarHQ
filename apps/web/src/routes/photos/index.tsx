import { createFileRoute } from "@tanstack/react-router"
import Library from "@polarhq/interface/screens/Photos/Library"

const RouteComponent = () => <Library />

export const Route = createFileRoute("/photos/")({ component: RouteComponent })

