"use client"

import { type ReactNode, useRef } from "react"
import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconArrowMerge,
  IconBold,
  IconBorderAll,
  IconBorderBottom,
  IconBorderInner,
  IconBorderLeft,
  IconBorderNone,
  IconBorderOuter,
  IconBorderRight,
  IconBorderTop,
  IconChevronDown,
  IconCurrencyDollar,
  IconEraser,
  IconItalic,
  IconNumber123,
  IconPercentage,
  IconStrikethrough,
  IconUnderline,
} from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Separator } from "@workspace/ui/components/separator"
import { type CellFormat, FONTS, FONT_SIZES, ZOOM_LEVELS } from "@pages/Sheets/sheetModel"
import type { BorderMode, SheetController } from "@pages/Sheets/useSheet"

const noBlur = (event: { preventDefault: () => void }) => event.preventDefault()

const Tool = ({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) => (
  <Button
    variant={active ? "secondary" : "ghost"}
    size="icon-sm"
    aria-label={label}
    title={label}
    disabled={disabled}
    onMouseDown={noBlur}
    onClick={onClick}
  >
    {children}
  </Button>
)

const Divider = () => <Separator orientation="vertical" className="mx-1 h-5" />

const ColorButton = ({
  kind,
  value,
  onChange,
}: {
  kind: "text" | "fill"
  value: string
  onChange: (value: string) => void
}) => {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={kind === "text" ? "Text color" : "Fill color"}
      title={kind === "text" ? "Text color" : "Fill color"}
      onMouseDown={noBlur}
      onClick={() => ref.current?.click()}
    >
      {kind === "text" ? (
        <span className="text-sm leading-none font-semibold" style={{ color: value }}>
          A
        </span>
      ) : (
        <span className="size-3.5 rounded-sm border" style={{ backgroundColor: value }} />
      )}
      <input
        ref={ref}
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
    </Button>
  )
}

const BORDER_OPTIONS: Array<{ mode: BorderMode; label: string; icon: ReactNode }> = [
  { mode: "all", label: "All borders", icon: <IconBorderAll className="size-4" /> },
  { mode: "inner", label: "Inner borders", icon: <IconBorderInner className="size-4" /> },
  { mode: "outer", label: "Outer borders", icon: <IconBorderOuter className="size-4" /> },
  { mode: "top", label: "Top border", icon: <IconBorderTop className="size-4" /> },
  { mode: "bottom", label: "Bottom border", icon: <IconBorderBottom className="size-4" /> },
  { mode: "left", label: "Left border", icon: <IconBorderLeft className="size-4" /> },
  { mode: "right", label: "Right border", icon: <IconBorderRight className="size-4" /> },
  { mode: "none", label: "Clear borders", icon: <IconBorderNone className="size-4" /> },
]

const SheetToolbar = ({ sheet }: { sheet: SheetController }) => {
  const f = sheet.focusFmt
  return (
    <div className="bg-card/60 flex flex-wrap items-center gap-0.5 border-b px-2 py-1">
      <Tool label="Undo" disabled={!sheet.canUndo} onClick={sheet.undo}>
        <IconArrowBackUp className="size-4" />
      </Tool>
      <Tool label="Redo" disabled={!sheet.canRedo} onClick={sheet.redo}>
        <IconArrowForwardUp className="size-4" />
      </Tool>
      <Divider />

      <Select value={String(sheet.zoom)} onValueChange={(value) => sheet.setZoom(Number(value))}>
        <SelectTrigger size="sm" className="w-[72px]" onMouseDown={noBlur}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ZOOM_LEVELS.map((level) => (
            <SelectItem key={level} value={String(level)}>
              {level}%
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Divider />

      <Tool label="Format as currency" onClick={() => sheet.applyFormat({ fmt: "currency" })}>
        <IconCurrencyDollar className="size-4" />
      </Tool>
      <Tool label="Format as percent" onClick={() => sheet.applyFormat({ fmt: "percent" })}>
        <IconPercentage className="size-4" />
      </Tool>
      <Tool label="Decrease decimal places" onClick={() => sheet.adjustDecimals(-1)}>
        <span className="text-[0.7rem] font-semibold tabular-nums">.0</span>
      </Tool>
      <Tool label="Increase decimal places" onClick={() => sheet.adjustDecimals(1)}>
        <span className="text-[0.7rem] font-semibold tabular-nums">.00</span>
      </Tool>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" title="More formats" onMouseDown={noBlur}>
              <IconNumber123 className="size-4" />
              <IconChevronDown className="size-3" />
            </Button>
          }
        />
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => sheet.applyFormat({ fmt: undefined, dec: undefined })}>
            Automatic
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => sheet.applyFormat({ fmt: "number" })}>
            Number
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => sheet.applyFormat({ fmt: "percent" })}>
            Percent
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => sheet.applyFormat({ fmt: "currency" })}>
            Currency
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Divider />

      <Select
        value={f.ff ?? "Default"}
        onValueChange={(value) => sheet.applyFormat({ ff: value && value !== "Default" ? value : undefined })}
      >
        <SelectTrigger size="sm" className="w-[112px]" onMouseDown={noBlur}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONTS.map((font) => (
            <SelectItem key={font} value={font} style={{ fontFamily: font === "Default" ? undefined : font }}>
              {font}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={String(f.fs ?? 10)}
        onValueChange={(value) => sheet.applyFormat({ fs: Number(value) })}
      >
        <SelectTrigger size="sm" className="w-[60px]" onMouseDown={noBlur}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONT_SIZES.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Divider />

      <Tool label="Bold" active={f.b} onClick={() => sheet.toggle("b")}>
        <IconBold className="size-4" />
      </Tool>
      <Tool label="Italic" active={f.i} onClick={() => sheet.toggle("i")}>
        <IconItalic className="size-4" />
      </Tool>
      <Tool label="Underline" active={f.u} onClick={() => sheet.toggle("u")}>
        <IconUnderline className="size-4" />
      </Tool>
      <Tool label="Strikethrough" active={f.s} onClick={() => sheet.toggle("s")}>
        <IconStrikethrough className="size-4" />
      </Tool>
      <ColorButton kind="text" value={f.color ?? "#000000"} onChange={(v) => sheet.applyFormat({ color: v })} />
      <Divider />

      <ColorButton kind="fill" value={f.bg ?? "#ffffff"} onChange={(v) => sheet.applyFormat({ bg: v })} />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" title="Borders" onMouseDown={noBlur}>
              <IconBorderOuter className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="start">
          {BORDER_OPTIONS.map((option) => (
            <DropdownMenuItem key={option.mode} onClick={() => sheet.setBorders(option.mode)}>
              {option.icon}
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Tool
        label={sheet.isSelectionMerged ? "Unmerge cells" : "Merge cells"}
        active={sheet.isSelectionMerged}
        onClick={() => (sheet.isSelectionMerged ? sheet.unmergeSelection() : sheet.mergeSelection())}
      >
        <IconArrowMerge className="size-4" />
      </Tool>
      <Divider />

      {(["left", "center", "right"] as const).map((align) => {
        const Icon = align === "left" ? IconAlignLeft : align === "center" ? IconAlignCenter : IconAlignRight
        return (
          <Tool
            key={align}
            label={`Align ${align}`}
            active={f.align === align}
            onClick={() => sheet.applyFormat({ align: f.align === align ? undefined : (align as CellFormat["align"]) })}
          >
            <Icon className="size-4" />
          </Tool>
        )
      })}
      <Divider />

      <Tool label="Clear formatting" onClick={sheet.clearFormatting}>
        <IconEraser className="size-4" />
      </Tool>
    </div>
  )
}

export default SheetToolbar
