import { BrowserRouter } from "react-router"
import Providers from "@components/Providers/Providers"
import { AppRoutes } from "@workspace/screens/router"

export const App = () => (
  <BrowserRouter>
    <Providers>
      <AppRoutes />
    </Providers>
  </BrowserRouter>
)
