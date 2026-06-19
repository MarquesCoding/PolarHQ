import { BrowserRouter } from "react-router"
import Providers from "@components/Providers/Providers"
import { AppRoutes } from "./routes"

export const App = () => (
  <BrowserRouter>
    <Providers>
      <AppRoutes />
    </Providers>
  </BrowserRouter>
)
