import { bounds, type BoardElement } from "./board"

const pointsToPath = (el: BoardElement): string => {
  const pts = el.points ?? []
  if (pts.length < 2) return ""
  let d = `M ${el.x + pts[0]!} ${el.y + pts[1]!}`
  for (let i = 2; i < pts.length - 1; i += 2) d += ` L ${el.x + pts[i]!} ${el.y + pts[i + 1]!}`
  return d
}

/** Path for a line/arrow: straight for 2 points, smoothly curved through any midpoints. */
const linePath = (el: BoardElement): string => {
  const pts = el.points ?? []
  if (pts.length < 4) return ""
  const ax = el.x
  const ay = el.y
  if (pts.length === 4)
    return `M ${ax + pts[0]!} ${ay + pts[1]!} L ${ax + pts[2]!} ${ay + pts[3]!}`
  let d = `M ${ax + pts[0]!} ${ay + pts[1]!}`
  for (let i = 2; i < pts.length - 2; i += 2) {
    const cx = ax + pts[i]!
    const cy = ay + pts[i + 1]!
    const mx = (cx + ax + pts[i + 2]!) / 2
    const my = (cy + ay + pts[i + 3]!) / 2
    d += ` Q ${cx} ${cy} ${mx} ${my}`
  }
  d += ` L ${ax + pts[pts.length - 2]!} ${ay + pts[pts.length - 1]!}`
  return d
}

const ArrowHead = ({
  x1,
  y1,
  x2,
  y2,
  strokeWidth,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  strokeWidth: number
}) => {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const len = 10 + strokeWidth * 2
  const a1 = angle + Math.PI * 0.82
  const a2 = angle - Math.PI * 0.82
  return (
    <>
      <line x1={x2} y1={y2} x2={x2 + len * Math.cos(a1)} y2={y2 + len * Math.sin(a1)} />
      <line x1={x2} y1={y2} x2={x2 + len * Math.cos(a2)} y2={y2 + len * Math.sin(a2)} />
    </>
  )
}

/** Renders a single whiteboard element as SVG. */
const ElementView = ({ el }: { el: BoardElement }) => {
  const stroke = {
    stroke: el.stroke,
    strokeWidth: el.strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    opacity: el.opacity / 100,
  }
  const fill = el.fill === "transparent" ? "none" : el.fill
  const b = bounds(el)

  switch (el.type) {
    case "rectangle":
      return <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={8} fill={fill} {...stroke} />
    case "ellipse":
      return (
        <ellipse
          cx={b.x + b.w / 2}
          cy={b.y + b.h / 2}
          rx={b.w / 2}
          ry={b.h / 2}
          fill={fill}
          {...stroke}
        />
      )
    case "diamond":
      return (
        <polygon
          points={`${b.x + b.w / 2},${b.y} ${b.x + b.w},${b.y + b.h / 2} ${b.x + b.w / 2},${b.y + b.h} ${b.x},${b.y + b.h / 2}`}
          fill={fill}
          {...stroke}
        />
      )
    case "line":
    case "arrow": {
      const pts = el.points ?? [0, 0, 0, 0]
      const n = pts.length
      const px = el.x + (pts[n - 4] ?? 0)
      const py = el.y + (pts[n - 3] ?? 0)
      const x2 = el.x + (pts[n - 2] ?? 0)
      const y2 = el.y + (pts[n - 1] ?? 0)
      return (
        <g fill="none" {...stroke}>
          <path d={linePath(el)} />
          {el.type === "arrow" ? (
            <ArrowHead x1={px} y1={py} x2={x2} y2={y2} strokeWidth={el.strokeWidth} />
          ) : null}
        </g>
      )
    }
    case "draw":
      return <path d={pointsToPath(el)} fill="none" {...stroke} />
    case "image": {
      const b = bounds(el)
      return el.src ? (
        <image href={el.src} x={b.x} y={b.y} width={b.w} height={b.h} opacity={el.opacity / 100} />
      ) : null
    }
    case "text": {
      const size = el.fontSize ?? 24
      return (
        <text
          x={el.x}
          y={el.y + size}
          fontSize={size}
          fill={el.stroke}
          opacity={el.opacity / 100}
          style={{ fontFamily: "var(--font-sans, sans-serif)" }}
        >
          {(el.text ?? "").split("\n").map((line, i) => (
            <tspan key={i} x={el.x} dy={i === 0 ? 0 : size * 1.25}>
              {line || " "}
            </tspan>
          ))}
        </text>
      )
    }
    default:
      return null
  }
}

export default ElementView
