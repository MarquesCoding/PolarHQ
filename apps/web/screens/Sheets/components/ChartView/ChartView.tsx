"use client"

import { type ChartDef, CHART_COLORS, colLabel } from "@pages/Sheets/sheetModel"
import type { SheetController } from "@pages/Sheets/useSheet"

const W = 300
const H = 190
const PAD = 26

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0)

const extract = (sheet: SheetController, chart: ChartDef) => {
  const { r0, c0, r1, c1 } = chart.range
  const hasHeader = r1 > r0
  const hasLabelCol = c1 > c0
  const dataR0 = hasHeader ? r0 + 1 : r0
  const seriesC0 = hasLabelCol ? c0 + 1 : c0
  const labels: string[] = []
  for (let r = dataR0; r <= r1; r += 1)
    labels.push(hasLabelCol ? sheet.display(r, c0) || `${r + 1}` : `${r - dataR0 + 1}`)
  const series: Array<{ name: string; values: number[] }> = []
  for (let c = seriesC0; c <= c1; c += 1) {
    const name = hasHeader ? sheet.display(r0, c) || colLabel(c) : colLabel(c)
    const values: number[] = []
    for (let r = dataR0; r <= r1; r += 1) values.push(num(sheet.valueAt(r, c)))
    series.push({ name, values })
  }
  return { labels, series }
}

const ChartView = ({ sheet, chart }: { sheet: SheetController; chart: ChartDef }) => {
  const { labels, series } = extract(sheet, chart)
  const plotW = W - PAD * 2
  const plotH = H - PAD * 2
  const allValues = series.flatMap((s) => s.values)
  const max = Math.max(1, ...allValues)
  const x = (i: number, count: number) => PAD + (plotW * (i + 0.5)) / Math.max(1, count)
  const y = (value: number) => PAD + plotH - (plotH * value) / max

  let body: React.ReactNode = null
  if (chart.type === "pie") {
    const data = series[0]?.values ?? []
    const total = data.reduce((sum, v) => sum + Math.max(0, v), 0) || 1
    const cx = W / 2
    const cy = H / 2
    const radius = Math.min(plotW, plotH) / 2
    let angle = -Math.PI / 2
    body = (
      <>
        {data.map((value, i) => {
          const slice = (Math.max(0, value) / total) * Math.PI * 2
          const x1 = cx + radius * Math.cos(angle)
          const y1 = cy + radius * Math.sin(angle)
          angle += slice
          const x2 = cx + radius * Math.cos(angle)
          const y2 = cy + radius * Math.sin(angle)
          const large = slice > Math.PI ? 1 : 0
          return (
            <path
              key={i}
              d={`M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
            />
          )
        })}
      </>
    )
  } else if (chart.type === "line") {
    body = (
      <>
        {series.map((s, si) => (
          <polyline
            key={si}
            fill="none"
            stroke={CHART_COLORS[si % CHART_COLORS.length]}
            strokeWidth={2}
            points={s.values.map((v, i) => `${x(i, labels.length)},${y(v)}`).join(" ")}
          />
        ))}
      </>
    )
  } else {
    const groupW = plotW / Math.max(1, labels.length)
    const barW = Math.max(2, (groupW * 0.7) / Math.max(1, series.length))
    body = (
      <>
        {labels.map((_, i) =>
          series.map((s, si) => {
            const value = s.values[i] ?? 0
            const gx = PAD + groupW * i + groupW * 0.15 + si * barW
            return (
              <rect
                key={`${i}-${si}`}
                x={gx}
                y={y(Math.max(0, value))}
                width={barW}
                height={Math.max(0, PAD + plotH - y(Math.max(0, value)))}
                fill={CHART_COLORS[si % CHART_COLORS.length]}
              />
            )
          }),
        )}
      </>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={chart.title}>
        {chart.type !== "pie" ? (
          <>
            <line x1={PAD} y1={PAD + plotH} x2={W - PAD} y2={PAD + plotH} stroke="currentColor" className="text-border" />
            <text x={PAD - 4} y={PAD + 4} textAnchor="end" className="fill-muted-foreground text-[9px]">
              {max.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </text>
          </>
        ) : null}
        {body}
      </svg>
      <div className="flex flex-wrap gap-x-3 gap-y-1 px-1">
        {(chart.type === "pie" ? labels : series.map((s) => s.name)).map((name, i) => (
          <span key={i} className="text-muted-foreground flex items-center gap-1 text-[11px]">
            <span
              className="size-2.5 rounded-sm"
              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            {name}
          </span>
        ))}
      </div>
    </div>
  )
}

export default ChartView
