"use client"

import type { ReactNode } from "react"
import {
  IconArrowRight,
  IconCircle,
  IconEraser,
  IconHandStop,
  IconLetterT,
  IconLine,
  IconPencil,
  IconPointer,
  IconSquare,
  IconSquareRotated,
} from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import { useTranslation } from "react-i18next"
import type { Tool } from "../board"

const Toolbar = ({ tool, setTool }: { tool: Tool; setTool: (tool: Tool) => void }) => {
  const { t } = useTranslation("whiteboard")

  const TOOLS: { tool: Tool; label: string; icon: (props: { className?: string }) => ReactNode }[] = [
    { tool: "pan", label: t("toolbar.pan"), icon: (p) => <IconHandStop {...p} /> },
    { tool: "select", label: t("toolbar.select"), icon: (p) => <IconPointer {...p} /> },
    { tool: "rectangle", label: t("toolbar.rectangle"), icon: (p) => <IconSquare {...p} /> },
    { tool: "diamond", label: t("toolbar.diamond"), icon: (p) => <IconSquareRotated {...p} /> },
    { tool: "ellipse", label: t("toolbar.ellipse"), icon: (p) => <IconCircle {...p} /> },
    { tool: "arrow", label: t("toolbar.arrow"), icon: (p) => <IconArrowRight {...p} /> },
    { tool: "line", label: t("toolbar.line"), icon: (p) => <IconLine {...p} /> },
    { tool: "draw", label: t("toolbar.draw"), icon: (p) => <IconPencil {...p} /> },
    { tool: "text", label: t("toolbar.text"), icon: (p) => <IconLetterT {...p} /> },
    { tool: "eraser", label: t("toolbar.eraser"), icon: (p) => <IconEraser {...p} /> },
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
