import { createFileRoute } from "@tanstack/react-router"
import Trash from "@pages/Photos/Trash"

const RouteComponent = () => <Trash />

export const Route = createFileRoute("/photos/trash")({ component: RouteComponent })

