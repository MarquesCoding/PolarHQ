import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/docs/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/document/$id", params: { id: params.id } })
  },
})

