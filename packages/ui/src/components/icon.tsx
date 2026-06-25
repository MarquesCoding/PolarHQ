"use client"

import type { ComponentType } from "react"
import { ArrowsIn } from "@phosphor-icons/react/ArrowsIn"
import { ArrowSquareOut } from "@phosphor-icons/react/ArrowSquareOut"
import { Buildings } from "@phosphor-icons/react/Buildings"
import { Calendar } from "@phosphor-icons/react/Calendar"
import { Camera } from "@phosphor-icons/react/Camera"
import { CaretLeft } from "@phosphor-icons/react/CaretLeft"
import { CaretRight } from "@phosphor-icons/react/CaretRight"
import { CheckCircle } from "@phosphor-icons/react/CheckCircle"
import { Copy } from "@phosphor-icons/react/Copy"
import { Database } from "@phosphor-icons/react/Database"
import { DownloadSimple } from "@phosphor-icons/react/DownloadSimple"
import { File } from "@phosphor-icons/react/File"
import { FilePdf } from "@phosphor-icons/react/FilePdf"
import { FileText } from "@phosphor-icons/react/FileText"
import { FileZip } from "@phosphor-icons/react/FileZip"
import { FolderOpen } from "@phosphor-icons/react/FolderOpen"
import { FolderSimple } from "@phosphor-icons/react/FolderSimple"
import { FolderSimpleLock } from "@phosphor-icons/react/FolderSimpleLock"
import { FolderSimpleUser } from "@phosphor-icons/react/FolderSimpleUser"
import { Gauge } from "@phosphor-icons/react/Gauge"
import { GearSix } from "@phosphor-icons/react/GearSix"
import { Heart } from "@phosphor-icons/react/Heart"
import { Image } from "@phosphor-icons/react/Image"
import { Images } from "@phosphor-icons/react/Images"
import { Info } from "@phosphor-icons/react/Info"
import { Key } from "@phosphor-icons/react/Key"
import { Lightning } from "@phosphor-icons/react/Lightning"
import { ListBullets } from "@phosphor-icons/react/ListBullets"
import { MagnifyingGlass } from "@phosphor-icons/react/MagnifyingGlass"
import { MagnifyingGlassMinus } from "@phosphor-icons/react/MagnifyingGlassMinus"
import { MagnifyingGlassPlus } from "@phosphor-icons/react/MagnifyingGlassPlus"
import { MapPin } from "@phosphor-icons/react/MapPin"
import { Minus } from "@phosphor-icons/react/Minus"
import { MusicNote } from "@phosphor-icons/react/MusicNote"
import { Palette } from "@phosphor-icons/react/Palette"
import { Pause } from "@phosphor-icons/react/Pause"
import { Play } from "@phosphor-icons/react/Play"
import { Plus } from "@phosphor-icons/react/Plus"
import { Presentation } from "@phosphor-icons/react/Presentation"
import { Prohibit } from "@phosphor-icons/react/Prohibit"
import { ShareNetwork } from "@phosphor-icons/react/ShareNetwork"
import { ShieldCheck } from "@phosphor-icons/react/ShieldCheck"
import { Sidebar } from "@phosphor-icons/react/Sidebar"
import { SidebarSimple } from "@phosphor-icons/react/SidebarSimple"
import { SlidersHorizontal } from "@phosphor-icons/react/SlidersHorizontal"
import { SpeakerHigh } from "@phosphor-icons/react/SpeakerHigh"
import { SpeakerSimpleX } from "@phosphor-icons/react/SpeakerSimpleX"
import { SquaresFour } from "@phosphor-icons/react/SquaresFour"
import { Stack } from "@phosphor-icons/react/Stack"
import { Table } from "@phosphor-icons/react/Table"
import { Tag } from "@phosphor-icons/react/Tag"
import { Trash } from "@phosphor-icons/react/Trash"
import { Users } from "@phosphor-icons/react/Users"
import { UsersThree } from "@phosphor-icons/react/UsersThree"
import { VideoCamera } from "@phosphor-icons/react/VideoCamera"
import { WarningCircle } from "@phosphor-icons/react/WarningCircle"
import { X } from "@phosphor-icons/react/X"
import * as coreFill24 from "nucleo-core-fill-24"
import * as uiFillDuo18 from "nucleo-ui-fill-duo-18"

export type IconProps = { className?: string }
type IconComponent = ComponentType<IconProps>

/**
 * Nucleo duo-tone icon packs. Every semantic key resolves Nucleo-first via {@link nucleoCandidates}
 * (preferring the duo-tone 18px set), falling back to the Phosphor map below for any key with no
 * Nucleo mapping or component.
 */
const nucleoPack: Record<string, IconComponent | undefined> = {
  ...(coreFill24 as Record<string, IconComponent | undefined>),
  ...(uiFillDuo18 as Record<string, IconComponent | undefined>),
}

const nucleoCandidates: Record<string, string[]> = {
  bolt: ["IconBoltFillDuo18", "IconBoltFill24"],
  search: ["IconMagnifierFillDuo18", "IconMagnifier2FillDuo18"],
  photo: ["IconImageFillDuo18", "IconImageFill24"],
  folder: ["IconFolderFillDuo18", "IconFolderFill24"],
  "folder-open": ["IconFolderOpenFillDuo18", "IconFolderOpenFill24"],
  "folder-lock": ["IconFolderLockFillDuo18", "IconFolderLockFill24"],
  "folder-key": ["IconFolderKeyFillDuo18"],
  "folder-shield": ["IconFolderShieldFillDuo18"],
  "file-text": ["IconFileFillDuo18", "IconFileFill24", "IconTextFill24"],
  document: ["IconFileContentFillDuo18", "IconFileFillDuo18"],
  "file-zip": ["IconFileZip2FillDuo18", "IconFileZipFillDuo18"],
  "file-pdf": ["IconFilePdfFillDuo18", "IconFilePdf2FillDuo18"],
  database: ["IconDatabaseFillDuo18", "IconDatabase2FillDuo18"],
  table: ["IconTableFillDuo18", "IconTableFill24"],
  presentation: ["IconPresentationFillDuo18", "IconPresentationFill24"],
  calendar: ["IconCalendarFillDuo18", "IconCalendarFill24"],
  video: ["IconVideoFillDuo18", "IconVideoFill24"],
  key: ["IconKeyFillDuo18", "IconKeyFill24"],
  "shield-lock": ["IconShieldLockFillDuo18", "IconShieldLockFill24"],
  albums: ["IconAlbumFillDuo18", "IconAlbumFill24", "IconImagesFill24"],
  favourites: ["IconHeartFillDuo18", "IconHeartFill24"],
  trash: ["IconTrashFillDuo18", "IconTrashFill24"],
  tag: ["IconTagFillDuo18", "IconTagFill24"],
  "images-3": ["IconImages3FillDuo18"],
  "album-3": ["IconAlbum3FillDuo18"],
  "image-upscale": ["IconImageUpscaleFillDuo18"],
  "image-scale": ["IconImageScaleFillDuo18"],
  "window-left": ["IconWindowLeftFillDuo18"],
  "layout-left": ["IconLayoutLeftFillDuo18"],
  "tile-to-left": ["IconTileToLeftFillDuo18"],
  "sidebar-left-2-show": ["IconSidebarLeft2ShowFillDuo18"],
  "sidebar-left-2-hide": ["IconSidebarLeft2HideFillDuo18"],
  "circle-check": ["IconCircleCheckFillDuo18"],
  "circle-warning": ["IconCircleWarningFillDuo18"],
  duplicate: ["IconDuplicateFillDuo18"],
  "nav-back": ["IconChevronLeftFillDuo18"],
  "nav-forward": ["IconChevronRightFillDuo18"],
  info: ["IconCircleInfoFillDuo18"],
  xmark: ["IconXmarkFillDuo18"],
  download: ["IconDownloadFillDuo18", "IconDownload2FillDuo18"],
  camera: ["IconCamera2FillDuo18"],
  "map-pin": ["IconMapPinFillDuo18"],
  plus: ["IconPlusFillDuo18"],
  minus: ["IconMinusFillDuo18"],
  "zoom-reset": ["IconArrowsReduceDiagonalFillDuo18"],
  play: ["IconCirclePlayFillDuo18"],
  music: ["IconMusicFillDuo18"],
  "media-play": ["IconMediaPlayFillDuo18"],
  "media-pause": ["IconMediaPauseFillDuo18"],
  volume: ["IconVolumeFillDuo18"],
  "volume-mute": ["IconVolumeXmarkFillDuo18"],
  fullscreen: ["IconFullScreenFillDuo18"],
  gauge: ["IconGaugeFillDuo18", "IconDashboardFillDuo18"],
  users: ["IconUsersFillDuo18", "IconUsers2FillDuo18"],
  "users-group": ["IconUsersGroupFillDuo18", "IconUsers3FillDuo18"],
  "user-shield": ["IconUserShieldFillDuo18", "IconShieldCheckFillDuo18"],
  sliders: ["IconSlidersFillDuo18", "IconAdjustmentsFillDuo18"],
  settings: ["IconGearFillDuo18", "IconSettingsFillDuo18"],
  apps: ["IconGrid2FillDuo18", "IconAppsFillDuo18"],
  palette: ["IconPaletteFillDuo18", "IconSwatchFillDuo18"],
  list: ["IconListFillDuo18", "IconList2FillDuo18"],
  ban: ["IconBanFillDuo18", "IconCircleXmarkFillDuo18"],
  buildings: ["IconBuildingsFillDuo18", "IconBuilding2FillDuo18"],
  share: ["IconShareFillDuo18", "IconShare2FillDuo18", "IconForwardFillDuo18"],
  "open-external": [
    "IconOpenExternalOutlineDuo18",
    "IconOpenExternalFillDuo18",
    "IconExternalLinkFillDuo18",
  ],
}

/** Resolve a semantic key to a Nucleo component, preferring the candidates in order. */
const resolveNucleo = (name: string): IconComponent | undefined => {
  for (const candidate of nucleoCandidates[name] ?? []) {
    const Resolved = nucleoPack[candidate]
    if (Resolved) return Resolved
  }
  return undefined
}

/**
 * Semantic icon key → @phosphor-icons/react component. Every key the Icon
 * previously supported (the union of the old Nucleo + Tabler maps) is kept
 * working; where Phosphor has no exact match the closest verified icon is used.
 */
const icons: Record<string, IconComponent> = {
  bolt: Lightning,
  search: MagnifyingGlass,
  photo: Image,
  folder: FolderSimple,
  "folder-open": FolderOpen,
  "folder-lock": FolderSimpleLock,
  "folder-key": FolderSimpleUser,
  "folder-shield": FolderSimpleLock,
  "file-text": FileText,
  document: File,
  "file-zip": FileZip,
  "file-pdf": FilePdf,
  database: Database,
  table: Table,
  presentation: Presentation,
  calendar: Calendar,
  video: VideoCamera,
  key: Key,
  "shield-lock": ShieldCheck,
  albums: Stack,
  favourites: Heart,
  trash: Trash,
  tag: Tag,
  "images-3": Images,
  "album-3": Stack,
  "image-upscale": MagnifyingGlassPlus,
  "image-scale": MagnifyingGlassMinus,
  "window-left": Sidebar,
  "layout-left": SidebarSimple,
  "tile-to-left": SidebarSimple,
  "sidebar-left-2-show": Sidebar,
  "sidebar-left-2-hide": SidebarSimple,
  "circle-check": CheckCircle,
  "circle-warning": WarningCircle,
  duplicate: Copy,
  "nav-back": CaretLeft,
  "nav-forward": CaretRight,
  info: Info,
  xmark: X,
  download: DownloadSimple,
  camera: Camera,
  "map-pin": MapPin,
  plus: Plus,
  minus: Minus,
  "zoom-reset": ArrowsIn,
  play: Play,
  music: MusicNote,
  "media-play": Play,
  "media-pause": Pause,
  volume: SpeakerHigh,
  "volume-mute": SpeakerSimpleX,
  fullscreen: ArrowsIn,
  gauge: Gauge,
  users: Users,
  "users-group": UsersThree,
  "user-shield": ShieldCheck,
  sliders: SlidersHorizontal,
  settings: GearSix,
  apps: SquaresFour,
  palette: Palette,
  list: ListBullets,
  ban: Prohibit,
  buildings: Buildings,
  share: ShareNetwork,
  "open-external": ArrowSquareOut,
}

/** Resolve an icon by key, falling back to a generic apps grid for unknown keys. */
export const Icon = ({ name, className }: { name: string; className?: string }) => {
  const Resolved = resolveNucleo(name) ?? icons[name] ?? SquaresFour
  return <Resolved className={className} />
}
