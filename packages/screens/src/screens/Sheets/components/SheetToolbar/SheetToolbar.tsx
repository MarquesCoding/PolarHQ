import { type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import {
  TextAlignCenter,
  TextAlignLeft,
  TextAlignRight,
  ArrowUUpLeft,
  ArrowUUpRight,
  ArrowsMerge,
  TextB,
  GridFour,
  ArrowLineDown,
  GridNine,
  ArrowLineLeft,
  Prohibit,
  Square,
  ArrowLineRight,
  ArrowLineUp,
  CaretDown,
  CurrencyDollar,
  Eraser,
  TextItalic,
  NumberCircleOne,
  Percent,
  TextStrikethrough,
  TextUnderline,
} from "@phosphor-icons/react"
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
import ColorPalette from "@pages/Sheets/components/ColorPalette/ColorPalette"
import NumberFormatItems from "@pages/Sheets/components/NumberFormatItems/NumberFormatItems"

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

const SheetToolbar = ({ sheet }: { sheet: SheetController }) => {
  const { t } = useTranslation("sheets")
  const f = sheet.focusFmt
  const BORDER_OPTIONS: Array<{ mode: BorderMode; label: string; icon: ReactNode }> = [
    { mode: "all", label: t("sheetToolbar.allBorders"), icon: <GridNine className="size-4" /> },
    { mode: "inner", label: t("sheetToolbar.innerBorders"), icon: <GridFour className="size-4" /> },
    { mode: "outer", label: t("sheetToolbar.outerBorders"), icon: <Square className="size-4" /> },
    { mode: "top", label: t("sheetToolbar.topBorder"), icon: <ArrowLineUp className="size-4" /> },
    { mode: "bottom", label: t("sheetToolbar.bottomBorder"), icon: <ArrowLineDown className="size-4" /> },
    { mode: "left", label: t("sheetToolbar.leftBorder"), icon: <ArrowLineLeft className="size-4" /> },
    { mode: "right", label: t("sheetToolbar.rightBorder"), icon: <ArrowLineRight className="size-4" /> },
    { mode: "none", label: t("sheetToolbar.clearBorders"), icon: <Prohibit className="size-4" /> },
  ]
  return (
    <div className="bg-card/60 flex flex-wrap items-center gap-0.5 border-b px-2 py-1">
      <Tool label={t("sheetToolbar.undo")} disabled={!sheet.canUndo} onClick={sheet.undo}>
        <ArrowUUpLeft className="size-4" />
      </Tool>
      <Tool label={t("sheetToolbar.redo")} disabled={!sheet.canRedo} onClick={sheet.redo}>
        <ArrowUUpRight className="size-4" />
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

      <Tool label={t("sheetToolbar.formatAsCurrency")} onClick={() => sheet.applyFormat({ fmt: "currency" })}>
        <CurrencyDollar className="size-4" />
      </Tool>
      <Tool label={t("sheetToolbar.formatAsPercent")} onClick={() => sheet.applyFormat({ fmt: "percent" })}>
        <Percent className="size-4" />
      </Tool>
      <Tool label={t("sheetToolbar.decreaseDecimalPlaces")} onClick={() => sheet.adjustDecimals(-1)}>
        <span className="text-[0.7rem] font-semibold tabular-nums">.0</span>
      </Tool>
      <Tool label={t("sheetToolbar.increaseDecimalPlaces")} onClick={() => sheet.adjustDecimals(1)}>
        <span className="text-[0.7rem] font-semibold tabular-nums">.00</span>
      </Tool>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" title={t("sheetToolbar.moreFormats")} onMouseDown={noBlur}>
              <NumberCircleOne className="size-4" />
              <CaretDown className="size-3" />
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="min-w-56">
          <NumberFormatItems sheet={sheet} />
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

      <Tool label={t("sheetToolbar.bold")} active={f.b} onClick={() => sheet.toggle("b")}>
        <TextB className="size-4" />
      </Tool>
      <Tool label={t("sheetToolbar.italic")} active={f.i} onClick={() => sheet.toggle("i")}>
        <TextItalic className="size-4" />
      </Tool>
      <Tool label={t("sheetToolbar.underline")} active={f.u} onClick={() => sheet.toggle("u")}>
        <TextUnderline className="size-4" />
      </Tool>
      <Tool label={t("sheetToolbar.strikethrough")} active={f.s} onClick={() => sheet.toggle("s")}>
        <TextStrikethrough className="size-4" />
      </Tool>
      <ColorPalette kind="text" value={f.color} onChange={(v) => sheet.applyFormat({ color: v })} />
      <Divider />

      <ColorPalette kind="fill" value={f.bg} onChange={(v) => sheet.applyFormat({ bg: v })} />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" title={t("sheetToolbar.borders")} onMouseDown={noBlur}>
              <Square className="size-4" />
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
        label={sheet.isSelectionMerged ? t("sheetToolbar.unmergeCells") : t("sheetToolbar.mergeCells")}
        active={sheet.isSelectionMerged}
        onClick={() => (sheet.isSelectionMerged ? sheet.unmergeSelection() : sheet.mergeSelection())}
      >
        <ArrowsMerge className="size-4" />
      </Tool>
      <Divider />

      {(["left", "center", "right"] as const).map((align) => {
        const Icon = align === "left" ? TextAlignLeft : align === "center" ? TextAlignCenter : TextAlignRight
        return (
          <Tool
            key={align}
            label={t("sheetToolbar.align", { align })}
            active={f.align === align}
            onClick={() => sheet.applyFormat({ align: f.align === align ? undefined : (align as CellFormat["align"]) })}
          >
            <Icon className="size-4" />
          </Tool>
        )
      })}
      <Divider />

      <Tool label={t("sheetToolbar.clearFormatting")} onClick={sheet.clearFormatting}>
        <Eraser className="size-4" />
      </Tool>
    </div>
  )
}

export default SheetToolbar
