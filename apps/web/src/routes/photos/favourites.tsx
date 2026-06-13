import { createFileRoute } from "@tanstack/react-router"
import Favourites from "@pages/Photos/Favourites"

const RouteComponent = () => <Favourites />

export const Route = createFileRoute("/photos/favourites")({ component: RouteComponent })

