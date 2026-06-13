import { createFileRoute } from "@tanstack/react-router"
import Browser from "@polarhq/interface/screens/Drive/Browser"

const RouteComponent = () => <Browser />

export const Route = createFileRoute("/drive/files")({ component: RouteComponent })

