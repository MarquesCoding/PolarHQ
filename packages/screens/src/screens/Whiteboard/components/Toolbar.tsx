import type { ReactNode } from "react"
import {
  ArrowRight,
  Circle,
  Cursor,
  Diamond,
  Eraser,
  Hand,
  LineSegment,
  PencilSimple,
  Square,
  TextT,
} from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import { useTranslation } from "react-i18next"
import type { Tool } from "../board"

const Toolbar = ({ tool, setTool }: { tool: Tool; setTool: (tool: Tool) => void }) => {
  const { t } = useTranslation("whiteboard")

  const TOOLS: { tool: Tool; label: string; icon: (props: { className?: string }) => ReactNode }[] = [
    { tool: "pan", label: t("toolbar.pan"), icon: (p) => <Hand {...p} /> },
    { tool: "select", label: t("toolbar.select"), icon: (p) => <Cursor {...p} /> },
    { tool: "rectangle", label: t("toolbar.rectangle"), icon: (p) => <Square {...p} /> },
    { tool: "diamond", label: t("toolbar.diamond"), icon: (p) => <Diamond {...p} /> },
    { tool: "ellipse", label: t("toolbar.ellipse"), icon: (p) => <Circle {...p} /> },
    { tool: "arrow", label: t("toolbar.arrow"), icon: (p) => <ArrowRight {...p} /> },
    { tool: "line", label: t("toolbar.line"), icon: (p) => <LineSegment {...p} /> },
    { tool: "draw", label: t("toolbar.draw"), icon: (p) => <PencilSimple {...p} /> },
    { tool: "text", label: t("toolbar.text"), icon: (p) => <TextT {...p} /> },
    { tool: "eraser", label: t("toolbar.eraser"), icon: (p) => <Eraser {...p} /> },
  ]

  return (
    <div className="bg-card absolute top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border p-1 shadow-sm">
      {TOOLS.map((entry) => (
        <Button
          key={entry.tool}
          variant={tool === entry.tool ? "secondary" : "ghost"}
          size="icon"
          className="size-9"
          aria-label={entry.label}
          title={entry.label}
          onClick={() => setTool(entry.tool)}
        >
          <entry.icon className="size-[18px]" />
        </Button>
      ))}
    </div>
  )
}

export default Toolbar
