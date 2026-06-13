import { createFileRoute } from "@tanstack/react-router"
import Backup from "@pages/Admin/Backup"

const RouteComponent = () => <Backup />

export const Route = createFileRoute("/admin/backup")({ component: RouteComponent })

