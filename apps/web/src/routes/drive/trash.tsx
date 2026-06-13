import { createFileRoute } from "@tanstack/react-router"
import Trash from "@pages/Drive/Trash"

const RouteComponent = () => <Trash />

export const Route = createFileRoute("/drive/trash")({ component: RouteComponent })

