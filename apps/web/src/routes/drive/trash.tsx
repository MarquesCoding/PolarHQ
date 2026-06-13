import { createFileRoute } from "@tanstack/react-router"
import Trash from "@polarhq/interface/screens/Drive/Trash"

const RouteComponent = () => <Trash />

export const Route = createFileRoute("/drive/trash")({ component: RouteComponent })

