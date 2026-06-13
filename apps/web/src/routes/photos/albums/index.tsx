import { createFileRoute } from "@tanstack/react-router"
import Albums from "@pages/Photos/Albums"

const RouteComponent = () => <Albums />

export const Route = createFileRoute("/photos/albums/")({ component: RouteComponent })

