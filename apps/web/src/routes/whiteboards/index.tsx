import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/whiteboards/")({
  beforeLoad: () => {
    throw redirect({ to: "/drive/files" })
  },
})

