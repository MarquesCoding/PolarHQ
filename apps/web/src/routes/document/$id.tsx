import { createFileRoute } from "@tanstack/react-router"
import Editor from "@polarhq/interface/screens/Docs/Editor"

const RouteComponent = () => {
  const { id } = Route.useParams()
  return <Editor key={id} nodeId={id} />
}

export const Route = createFileRoute("/document/$id")({ component: RouteComponent })

