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
import type { Tool } from "../board"

const TOOLS: { tool: Tool; label: string; icon: (props: { className?: string }) => ReactNode }[] = [
  { tool: "pan", label: "Pan", icon: (p) => <IconHandStop {...p} /> },
  { tool: "select", label: "Select", icon: (p) => <IconPointer {...p} /> },
  { tool: "rectangle", label: "Rectangle", icon: (p) => <IconSquare {...p} /> },
  { tool: "diamond", label: "Diamond", icon: (p) => <IconSquareRotated {...p} /> },
  { tool: "ellipse", label: "Ellipse", icon: (p) => <IconCircle {...p} /> },
  { tool: "arrow", label: "Arrow", icon: (p) => <IconArrowRight {...p} /> },
  { tool: "line", label: "Line", icon: (p) => <IconLine {...p} /> },
  { tool: "draw", label: "Draw", icon: (p) => <IconPencil {...p} /> },
  { tool: "text", label: "Text", icon: (p) => <IconLetterT {...p} /> },
  { tool: "eraser", label: "Eraser", icon: (p) => <IconEraser {...p} /> },
]

const Toolbar = ({ tool, setTool }: { tool: Tool; setTool: (tool: Tool) => void }) => (
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

export default Toolbar
