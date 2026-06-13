import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/sheets/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/sheet/$id", params: { id: params.id } })
  },
})

