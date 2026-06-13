import { createFileRoute } from "@tanstack/react-router"
import Browser from "@pages/Drive/Browser"

const RouteComponent = () => <Browser />

export const Route = createFileRoute("/drive/files")({ component: RouteComponent })

