import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/sheets/")({
  beforeLoad: () => {
    throw redirect({ to: "/drive/files" })
  },
})

