import { createFileRoute } from "@tanstack/react-router"
import { fetchSavedSearches } from "@polarhq/vault/drive"
import { useQuery } from "@tanstack/react-query"
import Browser from "@pages/Drive/Browser"

const RouteComponent = () => {
  const { id } = Route.useParams()
  const { data } = useQuery({ queryKey: ["drive", "searches"], queryFn: fetchSavedSearches })
  const search = data?.find((entry) => entry.id === id)
  if (!search) return null
  return <Browser source={{ view: "search", query: search.name }} />
}

export const Route = createFileRoute("/drive/search/$id")({ component: RouteComponent })
