import { createFileRoute } from "@tanstack/react-router"
import Backup from "@polarhq/interface/screens/Admin/Backup"

const RouteComponent = () => <Backup />

export const Route = createFileRoute("/admin/backup")({ component: RouteComponent })

