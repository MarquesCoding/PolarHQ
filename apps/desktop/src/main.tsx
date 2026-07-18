import { scan } from "react-scan"
import { createRoot } from "react-dom/client"
import "@workspace/ui/globals.css"
import "@fontsource-variable/geist"
import "@fontsource-variable/geist-mono"
import "./index.css"
import { Bootstrap } from "./Bootstrap"

// Opt-in only (localStorage.setItem("scan","1")) — leaving react-scan on instruments every render
// and paints overlays each frame, which itself makes the app feel laggy.
if (import.meta.env.DEV && localStorage.getItem("scan") === "1") scan({ enabled: true })

createRoot(document.getElementById("root")!).render(<Bootstrap />)
