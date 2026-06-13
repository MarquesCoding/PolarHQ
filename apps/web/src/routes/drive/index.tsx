import { createFileRoute } from "@tanstack/react-router"
import StorageOverview from "@pages/Drive/StorageOverview"

const RouteComponent = () => <StorageOverview />

export const Route = createFileRoute("/drive/")({ component: RouteComponent })

