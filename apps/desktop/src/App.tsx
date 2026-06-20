import { HashRouter } from "react-router"
import Providers from "@components/Providers/Providers"
import { AppRoutes } from "@workspace/screens/router"

/**
 * Desktop shell root. Mirrors the web shell but swaps `BrowserRouter` for `HashRouter`: Tauri serves
 * the bundle over a custom protocol with no SPA history fallback, so hash routing keeps deep links and
 * window reloads from 404ing. The route tree and every screen come from `@workspace/screens`.
 */
export const App = () => (
  <HashRouter>
    <Providers>
      <AppRoutes />
    </Providers>
  </HashRouter>
)
