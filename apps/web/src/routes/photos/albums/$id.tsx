import { createFileRoute } from "@tanstack/react-router"
import AlbumDetail from "@polarhq/interface/screens/Photos/AlbumDetail"

const RouteComponent = () => {
  const { id } = Route.useParams()
  return <AlbumDetail albumId={id} />
}

export const Route = createFileRoute("/photos/albums/$id")({ component: RouteComponent })

