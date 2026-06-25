import type { Plugin } from "vite"

/**
 * Vite resolver that swaps the **content** Phosphor icons used across the app for their Nucleo
 * duo-tone equivalents — so the ~80 components that import `@phosphor-icons/react` directly (barrel or
 * per-icon subpath) pick up the brand icon set without editing a single call site. Functional glyphs
 * (carets, check, x, plus/minus, spinner, magnifier, sidebar toggles…) aren't mapped and stay Phosphor,
 * since duo-tone reads poorly on them. `core:` targets come from `nucleo-core-fill-24`; the rest from
 * `nucleo-ui-fill-duo-18`. Every target below is verified to exist in the installed packs.
 */
const MAP: Record<string, string> = {
  Image: "IconImageFillDuo18",
  Images: "IconImages3FillDuo18",
  Stack: "IconStackFillDuo18",
  FolderSimple: "IconFolderFillDuo18",
  FolderOpen: "IconFolderOpenFillDuo18",
  FolderSimpleLock: "IconFolderLockFillDuo18",
  FolderSimpleUser: "IconFolderUserFillDuo18",
  Heart: "IconHeartFillDuo18",
  Trash: "IconTrashFillDuo18",
  Tag: "IconTagFillDuo18",
  FileText: "IconFileFillDuo18",
  FilePdf: "core:IconFilePdfFill24",
  FileZip: "IconFileZip2FillDuo18",
  File: "IconFileFillDuo18",
  Database: "IconDatabaseFillDuo18",
  Table: "IconTableFillDuo18",
  Presentation: "IconPresentationFillDuo18",
  Calendar: "IconCalendarFillDuo18",
  Camera: "IconCamera2FillDuo18",
  VideoCamera: "IconVideoFillDuo18",
  MapPin: "IconMapPinFillDuo18",
  MusicNote: "IconMusicFillDuo18",
  Play: "IconCirclePlayFillDuo18",
  Pause: "IconMediaPauseFillDuo18",
  SpeakerHigh: "IconVolumeFillDuo18",
  SpeakerSimpleX: "IconVolumeXmarkFillDuo18",
  Key: "IconKeyFillDuo18",
  ShieldCheck: "IconShieldCheckFillDuo18",
  Users: "IconUsersFillDuo18",
  UsersThree: "IconUsers3FillDuo18",
  Buildings: "IconApartmentBuildingFillDuo18",
  Palette: "IconPaletteFillDuo18",
  Gauge: "IconGaugeFillDuo18",
  DownloadSimple: "IconDownloadFillDuo18",
  Copy: "IconDuplicateFillDuo18",
  GearSix: "IconGearFillDuo18",
  SlidersHorizontal: "IconSlidersFillDuo18",
  SquaresFour: "IconGrid2FillDuo18",
  Lightning: "IconBoltFillDuo18",
  ListBullets: "IconBulletListFillDuo18",
  Info: "IconCircleInfoFillDuo18",
  CheckCircle: "IconCircleCheckFillDuo18",
  WarningCircle: "IconCircleWarningFillDuo18",
  WarningOctagon: "IconCircleWarningFillDuo18",
  Prohibit: "IconBanFillDuo18",
  ArrowSquareOut: "IconOpenExternalFillDuo18",
  // Functional UI glyphs — Nucleo's ui-fill-duo-18 is the interface set, so these read well too.
  MagnifyingGlass: "IconMagnifierFillDuo18",
  MagnifyingGlassPlus: "IconMagnifierPlusFillDuo18",
  MagnifyingGlassMinus: "IconMagnifierMinusFillDuo18",
  CaretDown: "IconChevronDownFillDuo18",
  CaretUp: "IconChevronUpFillDuo18",
  CaretLeft: "IconChevronLeftFillDuo18",
  CaretRight: "IconChevronRightFillDuo18",
  CaretUpDown: "IconChevronExpandYFillDuo18",
  Check: "IconCheckFillDuo18",
  X: "IconXmarkFillDuo18",
  Plus: "IconPlusFillDuo18",
  Minus: "IconMinusFillDuo18",
  Sidebar: "IconLayoutLeftFillDuo18",
  SidebarSimple: "IconLayoutLeftFillDuo18",
  ArrowsIn: "IconArrowsReduceDiagonalFillDuo18",
}

const exportLine = (phosphor: string, target: string): string => {
  const [pack, comp] = target.startsWith("core:")
    ? ["nucleo-core-fill-24", target.slice(5)]
    : ["nucleo-ui-fill-duo-18", target]
  return `export { ${comp} as ${phosphor} } from "${pack}"`
}

const BARREL = "@phosphor-icons/react"
const VIRT_BARREL = "\0phosphor-nucleo:barrel"
const VIRT_SUB = "\0phosphor-nucleo:sub:"

export const phosphorNucleo = (): Plugin => ({
  name: "phosphor-nucleo",
  enforce: "pre",
  resolveId(id, importer) {
    if (id === BARREL) {
      // The virtual barrel re-exports the real Phosphor — don't intercept that one (avoid a loop).
      return importer === VIRT_BARREL ? null : VIRT_BARREL
    }
    const match = id.match(/^@phosphor-icons\/react\/([A-Za-z0-9]+)$/)
    if (match && MAP[match[1]!]) return VIRT_SUB + match[1]
    return null
  },
  load(id) {
    if (id === VIRT_BARREL) {
      // Re-export everything from real Phosphor, then override the mapped names with Nucleo. An
      // explicit named export wins over `export *`, so only the content icons get swapped.
      const overrides = Object.entries(MAP)
        .map(([phosphor, target]) => exportLine(phosphor, target))
        .join("\n")
      return `export * from "${BARREL}";\n${overrides}\n`
    }
    if (id.startsWith(VIRT_SUB)) {
      const name = id.slice(VIRT_SUB.length)
      return exportLine(name, MAP[name]!)
    }
    return null
  },
})
