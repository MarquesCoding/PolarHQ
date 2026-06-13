import { Outlet, createRootRoute } from "@tanstack/react-router"
import Providers from "@polarhq/interface/components/Providers/Providers"

const RootComponent = () => (
  <Providers>
    <Outlet />
  </Providers>
)

export const Route = createRootRoute({ component: RootComponent })
