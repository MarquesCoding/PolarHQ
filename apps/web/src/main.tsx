import { StrictMode } from "react"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { createRoot } from "react-dom/client"

import "@fontsource-variable/geist"
import "@fontsource-variable/geist-mono"
import "@polarhq/ui/globals.css"
import "@lib/env"
import { routeTree } from "./routeTree.gen"

const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
