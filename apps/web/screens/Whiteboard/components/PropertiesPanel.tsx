"use client"

import {
  IconChevronDown,
  IconChevronsDown,
  IconChevronsUp,
  IconChevronUp,
} from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import { Slider } from "@workspace/ui/components/slider"
import { cn } from "@workspace/ui/lib/utils"
import { FILL_COLORS, STROKE_COLORS, STROKE_WIDTHS, type Style } from "../board"

interface Current {
  stroke: string
  fill: string
  strokeWidth: number
  opacity: number
}

interface Props {
  current: Current
  onStyle: (patch: Partial<Style>) => void
  hasSelection: boolean
  onReorder: (dir: "back" | "backward" | "forward" | "front") => void
}

const checker = {
  backgroundImage:
    "linear-gradient(45deg,#bbb 25%,transparent 25%),linear-gradient(-45deg,#bbb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#bbb 75%),linear-gradient(-45deg,transparent 75%,#bbb 75%)",
  backgroundSize: "8px 8px",
  backgroundPosition: "0 0,0 4px,4px -4px,-4px 0",
}

const Swatch = ({
  color,
  active,
  onClick,
}: {
  color: string
  active: boolean
  onClick: () => void
}) => (
  <button
    type="button"
    aria-label={color}
    onClick={onClick}
    className={cn(
      "size-7 shrink-0 rounded-md border",
      active ? "ring-primary ring-offset-background ring-2 ring-offset-1" : "border-border",
    )}
    style={color === "transparent" ? checker : { backgroundColor: color }}
  />
)

const Label = ({ children }: { children: string }) => (
  <p className="text-muted-foreground text-xs font-medium">{children}</p>
)

const PropertiesPanel = ({ current, onStyle, hasSelection, onReorder }: Props) => (
  <div className="bg-card absolute top-3 left-3 z-10 flex w-52 flex-col gap-3 rounded-xl border p-3 shadow-sm">
    <div className="flex flex-col gap-1.5">
      <Label>Stroke</Label>
      <div className="flex items-center gap-1.5">
        {STROKE_COLORS.map((color) => (
          <Swatch
            key={color}
            color={color}
            active={current.stroke === color}
            onClick={() => onStyle({ stroke: color })}
          />
        ))}
        <div className="bg-border mx-0.5 h-6 w-px" />
        <div className="size-7 rounded-md border" style={{ backgroundColor: current.stroke }} />
      </div>
    </div>

    <div className="flex flex-col gap-1.5">
      <Label>Background</Label>
      <div className="flex items-center gap-1.5">
        {FILL_COLORS.map((color) => (
          <Swatch
            key={color}
            color={color}
            active={current.fill === color}
            onClick={() => onStyle({ fill: color })}
          />
        ))}
        <div className="bg-border mx-0.5 h-6 w-px" />
        <div
          className="size-7 rounded-md border"
          style={current.fill === "transparent" ? checker : { backgroundColor: current.fill }}
        />
      </div>
    </div>

    <div className="flex flex-col gap-1.5">
      <Label>Stroke width</Label>
      <div className="flex items-center gap-1.5">
        {STROKE_WIDTHS.map((width) => (
          <Button
            key={width.value}
            variant={current.strokeWidth === width.value ? "secondary" : "outline"}
            size="icon"
            className="size-9"
            aria-label={width.label}
            onClick={() => onStyle({ strokeWidth: width.value })}
          >
            <span
              className="bg-foreground w-4 rounded-full"
              style={{ height: Math.max(2, width.value) }}
            />
          </Button>
        ))}
      </div>
    </div>

    <div className="flex flex-col gap-1.5">
      <Label>Opacity</Label>
      <Slider
        value={[current.opacity]}
        min={0}
        max={100}
        step={10}
        onValueChange={(value) =>
          onStyle({ opacity: Array.isArray(value) ? (value[0] ?? 100) : value })
        }
      />
    </div>

    {hasSelection ? (
      <div className="flex flex-col gap-1.5">
        <Label>Layers</Label>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="size-9" aria-label="Send to back" onClick={() => onReorder("back")}>
            <IconChevronsDown className="size-4" />
          </Button>
          <Button variant="outline" size="icon" className="size-9" aria-label="Send backward" onClick={() => onReorder("backward")}>
            <IconChevronDown className="size-4" />
          </Button>
          <Button variant="outline" size="icon" className="size-9" aria-label="Bring forward" onClick={() => onReorder("forward")}>
            <IconChevronUp className="size-4" />
          </Button>
          <Button variant="outline" size="icon" className="size-9" aria-label="Bring to front" onClick={() => onReorder("front")}>
            <IconChevronsUp className="size-4" />
          </Button>
        </div>
      </div>
    ) : null}
  </div>
)

export default PropertiesPanel
