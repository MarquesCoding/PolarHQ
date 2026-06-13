import { createFileRoute } from "@tanstack/react-router"
import TagView from "@polarhq/interface/screens/Photos/TagView"

const RouteComponent = () => {
  const { id } = Route.useParams()
  return <TagView tagId={id} />
}

export const Route = createFileRoute("/photos/tags/$id")({ component: RouteComponent })

