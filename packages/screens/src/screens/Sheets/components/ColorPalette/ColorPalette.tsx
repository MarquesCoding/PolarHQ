import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Prohibit, Plus } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { cn } from "@workspace/ui/lib/utils"

const PALETTE = [
  "#000000,#434343,#666666,#999999,#b7b7b7,#cccccc,#d9d9d9,#efefef,#f3f3f3,#ffffff",
  "#980000,#ff0000,#ff9900,#ffff00,#00ff00,#00ffff,#4a86e8,#0000ff,#9900ff,#ff00ff",
  "#e6b8af,#f4cccc,#fce5cd,#fff2cc,#d9ead3,#d0e0e3,#c9daf8,#cfe2f3,#d9d2e9,#ead1dc",
  "#dd7e6b,#ea9999,#f9cb9c,#ffe599,#b6d7a8,#a2c4c9,#a4c2f4,#9fc5e8,#b4a7d6,#d5a6bd",
  "#cc4125,#e06666,#f6b26b,#ffd966,#93c47d,#76a5af,#6d9eeb,#6fa8dc,#8e7cc3,#c27ba0",
  "#a61c00,#cc0000,#e69138,#f1c232,#6aa84f,#45818e,#3c78d8,#3d85c6,#674ea7,#a64d79",
  "#85200c,#990000,#b45f06,#bf9000,#38761d,#134f5c,#1155cc,#0b5394,#351c75,#741b47",
  "#5b0f00,#660000,#783f04,#7f6000,#274e13,#0c343d,#1c4587,#073763,#20124d,#4c1130",
].map((row) => row.split(","))

interface ColorPaletteProps {
  kind: "text" | "fill"
  value?: string
  onChange: (value: string | undefined) => void
}

/** Google-Sheets-style color picker: a swatch palette, a reset, and a custom picker. */
const ColorPalette = ({ kind, value, onChange }: ColorPaletteProps) => {
  const { t } = useTranslation("sheets")
  const [open, setOpen] = useState(false)
  const customRef = useRef<HTMLInputElement>(null)

  const pick = (color: string | undefined) => {
    onChange(color)
    setOpen(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={kind === "text" ? t("colorPalette.textColor") : t("colorPalette.fillColor")}
            title={kind === "text" ? t("colorPalette.textColor") : t("colorPalette.fillColor")}
            onMouseDown={(event) => event.preventDefault()}
          >
            {kind === "text" ? (
              <span className="flex flex-col items-center leading-none">
                <span className="text-[0.7rem] font-semibold">A</span>
                <span className="h-[3px] w-3.5 rounded-sm" style={{ backgroundColor: value ?? "#888" }} />
              </span>
            ) : (
              <span className="size-3.5 rounded-sm border" style={{ backgroundColor: value ?? "#fff" }} />
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-auto p-2">
        <button
          type="button"
          onClick={() => pick(undefined)}
          className="hover:bg-accent text-muted-foreground mb-1.5 flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-sm"
        >
          <Prohibit className="size-4" />
          {t("colorPalette.reset")}
        </button>
        <div className="flex flex-col gap-1">
          {PALETTE.map((row, ri) => (
            <div key={ri} className="flex gap-1">
              {row.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  aria-label={hex}
                  onClick={() => pick(hex)}
                  className={cn(
                    "size-5 rounded-sm border border-black/10",
                    value?.toLowerCase() === hex && "ring-primary ring-2 ring-offset-1",
                  )}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => customRef.current?.click()}
          className="hover:bg-accent text-muted-foreground mt-2 flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-sm"
        >
          <Plus className="size-4" />
          {t("colorPalette.custom")}
          <input
            ref={customRef}
            type="color"
            value={value ?? "#000000"}
            onChange={(event) => pick(event.target.value)}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
          />
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ColorPalette
