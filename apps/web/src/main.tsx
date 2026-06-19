import { createRoot } from "react-dom/client"
import "@workspace/ui/globals.css"
import "@fontsource-variable/geist"
import "@fontsource-variable/geist-mono"
import "./index.css"
import "@lib/env"
import { App } from "./App"

createRoot(document.getElementById("root")!).render(<App />)
