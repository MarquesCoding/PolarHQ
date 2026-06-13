import { createFileRoute } from "@tanstack/react-router"
import FullEditor from "@pages/Sheets/FullEditor"

const RouteComponent = () => {
  const { id } = Route.useParams()
  return <FullEditor key={id} nodeId={id} />
}

export const Route = createFileRoute("/sheet/$id")({ component: RouteComponent })

