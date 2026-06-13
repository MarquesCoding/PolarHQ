import { createFileRoute } from "@tanstack/react-router"
import Setup from "@polarhq/interface/screens/Setup/Setup"

const RouteComponent = () => <Setup />

export const Route = createFileRoute("/setup")({ component: RouteComponent })

