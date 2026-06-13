import { createFileRoute } from "@tanstack/react-router"
import FullEditor from "@polarhq/interface/screens/Sheets/FullEditor"

const RouteComponent = () => {
  const { id } = Route.useParams()
  return <FullEditor key={id} nodeId={id} />
}

export const Route = createFileRoute("/sheet/$id")({ component: RouteComponent })

