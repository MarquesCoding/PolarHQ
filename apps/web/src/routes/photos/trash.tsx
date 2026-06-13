import { createFileRoute } from "@tanstack/react-router"
import Trash from "@polarhq/interface/screens/Photos/Trash"

const RouteComponent = () => <Trash />

export const Route = createFileRoute("/photos/trash")({ component: RouteComponent })

