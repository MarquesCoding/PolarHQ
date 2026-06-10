"use client"

import { usePathname } from "next/navigation"
import { Icon } from "@lib/icons"
import { usePersistentNumber } from "@lib/persistentSetting"
import SizeControl from "@pages/Photos/components/SizeControl/SizeControl"

const TITLES: { match: (p: string) => boolean; label: string; icon: string }[] = [
  { match: (p) => p === "/photos", label: "All photos", icon: "images-3" },
  { match: (p) => p.startsWith("/photos/albums"), label: "Albums", icon: "album-3" },
  { match: (p) => p.startsWith("/photos/map"), label: "Map", icon: "map-pin" },
  { match: (p) => p.startsWith("/photos/favourites"), label: "Favourites", icon: "favourites" },
  { match: (p) => p.startsWith("/photos/trash"), label: "Trash", icon: "trash" },
  { match: (p) => p.startsWith("/photos/tags"), label: "Tag", icon: "tag" },
]

const FlatTopBar = () => {
  const pathname = usePathname()
  const [rowHeight, setRowHeight] = usePersistentNumber("photos.rowHeight", 180)
  const [gap, setGap] = usePersistentNumber("photos.gap", 12)
  const [rounded, setRounded] = usePersistentNumber("photos.rounded", 1)
  const [square, setSquare] = usePersistentNumber("photos.square", 0)

  const current = TITLES.find((entry) => entry.match(pathname)) ?? TITLES[0]!

  return (
    <header className="border-border bg-sidebar flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
      <Icon name={current.icon} className="text-muted-foreground size-[18px]" />
      <span className="text-sm font-medium">{current.label}</span>
      <div className="ml-auto">
        <SizeControl
          value={rowHeight}
          onChange={setRowHeight}
          gap={gap}
          onGapChange={setGap}
          rounded={rounded === 1}
          onRoundedChange={(value) => setRounded(value ? 1 : 0)}
          square={square === 1}
          onSquareChange={(value) => setSquare(value ? 1 : 0)}
        />
      </div>
    </header>
  )
}

export default FlatTopBar
