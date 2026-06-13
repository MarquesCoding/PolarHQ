import { createFileRoute } from "@tanstack/react-router"
import Browser from "@pages/Drive/Browser"

const RouteComponent = () => <Browser source={{ view: "recent" }} />

export const Route = createFileRoute("/drive/recent")({ component: RouteComponent })

