import { createFileRoute } from "@tanstack/react-router"
import Browser from "@polarhq/interface/screens/Drive/Browser"

const RouteComponent = () => {
  const { id } = Route.useParams()
  return <Browser source={{ view: "tag", tagId: id }} />
}

export const Route = createFileRoute("/drive/tag/$id")({ component: RouteComponent })
