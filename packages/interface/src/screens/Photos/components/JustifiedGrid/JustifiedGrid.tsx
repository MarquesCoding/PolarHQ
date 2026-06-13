"use client"

import type { GridAsset } from "@polarhq/vault/photos"
import { useElementWidth } from "@polarhq/interface/lib/useElementWidth"
import PhotoTile from "@polarhq/interface/screens/Photos/components/PhotoTile/PhotoTile"

const TARGET_ROW_HEIGHT = 180
const GAP = 4

interface LaidOutAsset {
  asset: GridAsset
  width: number
  height: number
}

const aspectOf = (asset: GridAsset): number => {
  const raw = asset.width && asset.height ? asset.width / asset.height : 1
  return Math.min(Math.max(raw, 0.4), 3)
}

const buildRows = (assets: GridAsset[], containerWidth: number): LaidOutAsset[][] => {
  if (containerWidth <= 0) return []
  const rows: LaidOutAsset[][] = []
  let current: { asset: GridAsset; aspect: number }[] = []
  let aspectSum = 0

  const flush = (stretch: boolean) => {
    if (current.length === 0) return
    const gaps = (current.length - 1) * GAP
    const height = stretch ? (containerWidth - gaps) / aspectSum : TARGET_ROW_HEIGHT
    rows.push(current.map((item) => ({ asset: item.asset, width: height * item.aspect, height })))
    current = []
    aspectSum = 0
  }

  for (const asset of assets) {
    const aspect = aspectOf(asset)
    current.push({ asset, aspect })
    aspectSum += aspect
    const gaps = (current.length - 1) * GAP
    if (aspectSum * TARGET_ROW_HEIGHT + gaps >= containerWidth) flush(true)
  }
  flush(false)
  return rows
}

interface JustifiedGridProps {
  assets: GridAsset[]
  isSelected: (id: string) => boolean
  selectionActive: boolean
  onOpen: (assetId: string) => void
  onToggle: (assetId: string, shiftKey: boolean) => void
}

const JustifiedGrid = ({
  assets,
  isSelected,
  selectionActive,
  onOpen,
  onToggle,
}: JustifiedGridProps) => {
  const [ref, width] = useElementWidth()
  const rows = buildRows(assets, width)

  return (
    <div ref={ref} className="flex w-full flex-col overflow-hidden" style={{ gap: GAP }}>
      {rows.map((row, rowIndex) => (
        <div key={row[0]?.asset.id ?? rowIndex} className="flex" style={{ gap: GAP }}>
          {row.map((item) => (
            <div
              key={item.asset.id}
              className="shrink-0"
              style={{ width: item.width, height: item.height }}
            >
              <PhotoTile
                asset={item.asset}
                selected={isSelected(item.asset.id)}
                selectionActive={selectionActive}
                onOpen={() => onOpen(item.asset.id)}
                onToggle={(shiftKey) => onToggle(item.asset.id, shiftKey)}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default JustifiedGrid
