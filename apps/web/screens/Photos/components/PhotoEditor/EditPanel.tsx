import { Icon } from "@lib/icons"
import { ArrowClockwise, Crop, Sparkle, TextT } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Slider } from "@workspace/ui/components/slider"
import { cn } from "@workspace/ui/lib/utils"
import { useTranslation } from "react-i18next"
import {
  ADJUSTERS,
  ASPECTS,
  FULL_CROP,
  type Histogram as HistogramData,
  type PhotoEditorController,
  TEXT_COLORS,
} from "./usePhotoEditor"

const Histogram = ({ histogram }: { histogram: HistogramData }) => {
  const max = Math.max(1, ...histogram.r, ...histogram.g, ...histogram.b)
  const path = (values: number[]): string =>
    values
      .map((value, index) => {
        const x = (index / 255) * 100
        const y = 100 - (value / max) * 100
        return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`
      })
      .join(" ")
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="bg-muted/40 h-20 w-full rounded-md">
      <path d={`${path(histogram.r)} L100,100 L0,100 Z`} fill="rgb(244 63 94 / 0.4)" />
      <path d={`${path(histogram.g)} L100,100 L0,100 Z`} fill="rgb(34 197 94 / 0.4)" />
      <path d={`${path(histogram.b)} L100,100 L0,100 Z`} fill="rgb(59 130 246 / 0.4)" />
    </svg>
  )
}

/** The editor's controls — tabs, histogram and the adjust/crop/text panels — for the Lightbox aside. */
const EditPanel = ({ controller }: { controller: PhotoEditorController }) => {
  const { t } = useTranslation("photos")
  const {
    tool,
    setTool,
    adjustments,
    setAdjustments,
    rotate90,
    setCrop,
    aspect,
    applyAspect,
    setTexts,
    active,
    setActiveText,
    addText,
    histogram,
    dirty,
    saving,
    reset,
    save,
  } = controller

  return (
    <div className="flex h-full w-full flex-col">
      <div className="border-border/60 flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-medium">{t("photoEditor.title")}</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={reset} disabled={!dirty || saving}>
            {t("photoEditor.reset")}
          </Button>
          <Button size="sm" onClick={() => void save()} disabled={!dirty || saving}>
            {saving ? t("photoEditor.saving") : t("photoEditor.saveCopy")}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <div className="bg-muted/40 flex items-center gap-1 rounded-lg p-1">
          {(
            [
              { key: "adjust", label: t("photoEditor.adjust"), icon: <Sparkle className="size-4" /> },
              { key: "crop", label: t("photoEditor.crop"), icon: <Crop className="size-4" /> },
              { key: "text", label: t("photoEditor.text"), icon: <TextT className="size-4" /> },
            ] as const
          ).map((item) => (
            <Button
              key={item.key}
              variant={tool === item.key ? "default" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => setTool(item.key)}
            >
              {item.icon}
              {item.label}
            </Button>
          ))}
        </div>

        {histogram ? <Histogram histogram={histogram} /> : null}

        {tool === "adjust" ? (
          <div className="flex flex-col gap-3">
            {ADJUSTERS.map(({ key, labelKey }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t(labelKey)}</span>
                  <span className="tabular-nums">{adjustments[key]}</span>
                </div>
                <Slider
                  min={key === "vignette" ? 0 : -100}
                  max={100}
                  value={[adjustments[key]]}
                  onValueChange={(value) =>
                    setAdjustments((current) => ({
                      ...current,
                      [key]: Math.round(Array.isArray(value) ? (value[0] ?? 0) : value),
                    }))
                  }
                />
              </div>
            ))}
          </div>
        ) : null}

        {tool === "crop" ? (
          <div className="flex flex-col gap-3">
            <Button variant="outline" size="sm" onClick={rotate90}>
              <ArrowClockwise className="size-4" />
              {t("photoEditor.rotate90")}
            </Button>
            <div className="grid grid-cols-3 gap-1.5">
              {ASPECTS.map((item) => (
                <Button
                  key={item.label}
                  variant={aspect === item.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => applyAspect(item.value)}
                >
                  {item.labelKey ? t(item.labelKey) : item.label}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  applyAspect(null)
                  setCrop(FULL_CROP)
                }}
              >
                {t("photoEditor.reset")}
              </Button>
            </div>
          </div>
        ) : null}

        {tool === "text" ? (
          <div className="flex flex-col gap-3">
            <Button variant="outline" size="sm" onClick={addText}>
              <TextT className="size-4" />
              {t("photoEditor.addText")}
            </Button>
            {active ? (
              <>
                <Input
                  value={active.text}
                  placeholder={t("photoEditor.textPlaceholder")}
                  onChange={(event) =>
                    setTexts((current) =>
                      current.map((item) =>
                        item.id === active.id ? { ...item, text: event.target.value } : item,
                      ),
                    )
                  }
                />
                <div className="flex flex-col gap-1.5">
                  <span className="text-muted-foreground text-xs">{t("photoEditor.size")}</span>
                  <Slider
                    min={3}
                    max={20}
                    value={[active.size]}
                    onValueChange={(value) =>
                      setTexts((current) =>
                        current.map((item) =>
                          item.id === active.id
                            ? { ...item, size: Math.round(Array.isArray(value) ? (value[0] ?? 8) : value) }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TEXT_COLORS.map((color) => (
                    <Button
                      key={color}
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("photoEditor.colour", { color })}
                      onClick={() =>
                        setTexts((current) =>
                          current.map((item) =>
                            item.id === active.id ? { ...item, color } : item,
                          ),
                        )
                      }
                      className={cn(
                        "rounded-full border",
                        active.color === color && "ring-primary ring-2",
                      )}
                      style={{ backgroundColor: color }}
                    >
                      <span className="sr-only">{color}</span>
                    </Button>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTexts((current) => current.filter((item) => item.id !== active.id))
                    setActiveText(null)
                  }}
                >
                  <Icon name="trash" className="size-4" />
                  {t("photoEditor.removeText")}
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground text-xs">{t("photoEditor.textHint")}</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default EditPanel
