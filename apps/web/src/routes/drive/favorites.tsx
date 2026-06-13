import { createFileRoute } from "@tanstack/react-router"
import Browser from "@pages/Drive/Browser"

const RouteComponent = () => <Browser source={{ view: "favorites" }} />

export const Route = createFileRoute("/drive/favorites")({ component: RouteComponent })

