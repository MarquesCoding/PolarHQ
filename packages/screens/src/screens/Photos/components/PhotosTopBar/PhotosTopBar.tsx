import { usePathname } from "@workspace/screens/platform"
import { useTranslation } from "react-i18next"
import { usePersistentNumber } from "@workspace/screens/persistentSetting"
import { FlatTopBar, type TopBarTitle } from "@components/FlatShell"
import SizeControl from "@pages/Photos/components/SizeControl/SizeControl"

/** The size control only makes sense on photo-grid routes — not the albums list or the map. */
const showsGrid = (pathname: string): boolean =>
  pathname === "/photos" ||
  pathname.startsWith("/photos/favourites") ||
  pathname.startsWith("/photos/trash") ||
  pathname.startsWith("/photos/tags/") ||
  /^\/photos\/albums\/.+/.test(pathname)

const PhotosTopBar = () => {
  const { t } = useTranslation("photos")
  const pathname = usePathname()
  const titles: TopBarTitle[] = [
    { match: (p) => p === "/photos", label: t("photosTopBar.allPhotos"), icon: "images-3" },
    { match: (p) => p.startsWith("/photos/albums"), label: t("photosTopBar.albums"), icon: "album-3" },
    { match: (p) => p.startsWith("/photos/map"), label: t("photosTopBar.map"), icon: "map-pin" },
    { match: (p) => p.startsWith("/photos/favourites"), label: t("photosTopBar.favourites"), icon: "favourites" },
    { match: (p) => p.startsWith("/photos/trash"), label: t("photosTopBar.trash"), icon: "trash" },
    { match: (p) => p.startsWith("/photos/tags"), label: t("photosTopBar.tag"), icon: "tag" },
  ]
  const [rowHeight, setRowHeight] = usePersistentNumber("photos.rowHeight", 180)
  const [gap, setGap] = usePersistentNumber("photos.gap", 12)
  const [rounded, setRounded] = usePersistentNumber("photos.rounded", 1)
  const [square, setSquare] = usePersistentNumber("photos.square", 0)

  return (
    <FlatTopBar
      titles={titles}
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
