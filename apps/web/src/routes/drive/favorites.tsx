import { createFileRoute } from "@tanstack/react-router"
import Browser from "@polarhq/interface/screens/Drive/Browser"

const RouteComponent = () => <Browser source={{ view: "favorites" }} />

export const Route = createFileRoute("/drive/favorites")({ component: RouteComponent })

