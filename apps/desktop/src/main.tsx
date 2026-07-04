import { scan } from "react-scan"
import { createRoot } from "react-dom/client"
import "@workspace/ui/globals.css"
import "@fontsource-variable/geist"
import "@fontsource-variable/geist-mono"
import "./index.css"
import { Bootstrap } from "./Bootstrap"

if (import.meta.env.DEV) scan({ enabled: true })

createRoot(document.getElementById("root")!).render(<Bootstrap />)
