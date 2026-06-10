"use client"

import { usePathname } from "next/navigation"
import { usePersistentNumber } from "@lib/persistentSetting"
import { FlatTopBar, type TopBarTitle } from "@components/FlatShell"
import SizeControl from "@pages/Photos/components/SizeControl/SizeControl"

const TITLES: TopBarTitle[] = [
  { match: (p) => p === "/photos", label: "All photos", icon: "images-3" },
  { match: (p) => p.startsWith("/photos/albums"), label: "Albums", icon: "album-3" },
  { match: (p) => p.startsWith("/photos/map"), label: "Map", icon: "map-pin" },
  { match: (p) => p.startsWith("/photos/favourites"), label: "Favourites", icon: "favourites" },
  { match: (p) => p.startsWith("/photos/trash"), label: "Trash", icon: "trash" },
  { match: (p) => p.startsWith("/photos/tags"), label: "Tag", icon: "tag" },
]

/** The size control only makes sense on photo-grid routes — not the albums list or the map. */
const showsGrid = (pathname: string): boolean =>
  pathname === "/photos" ||
  pathname.startsWith("/photos/favourites") ||
  pathname.startsWith("/photos/trash") ||
  pathname.startsWith("/photos/tags/") ||
  /^\/photos\/albums\/.+/.test(pathname)

const PhotosTopBar = () => {
  const pathname = usePathname()
  const [rowHeight, setRowHeight] = usePersistentNumber("photos.rowHeight", 180)
  const [gap, setGap] = usePersistentNumber("photos.gap", 12)
  const [rounded, setRounded] = usePersistentNumber("photos.rounded", 1)
  const [square, setSquare] = usePersistentNumber("photos.square", 0)

  return (
    <FlatTopBar
      titles={TITLES}
      extra={
        showsGrid(pathname) ? (
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
        ) : null
      }
    />
  )
}

export default PhotosTopBar
