import { createFileRoute } from "@tanstack/react-router"
import WhiteboardEditor from "@pages/Whiteboard/WhiteboardEditor"

const RouteComponent = () => {
  const { id } = Route.useParams()
  return <WhiteboardEditor key={id} nodeId={id} />
}

export const Route = createFileRoute("/whiteboard/$id")({ component: RouteComponent })

