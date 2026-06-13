import { createFileRoute } from "@tanstack/react-router"
import Browser from "@polarhq/interface/screens/Drive/Browser"

const RouteComponent = () => {
  const { id } = Route.useParams()
  return <Browser folderId={id} />
}

export const Route = createFileRoute("/drive/$id")({ component: RouteComponent })

