import type { ComponentType } from "react"
import {
  IconAdjustments,
  IconApps,
  IconBan,
  IconGauge,
  IconLayoutGrid,
  IconList,
  IconPalette,
  IconSettings,
  IconShield,
  IconUsers,
  IconUsersGroup,
  IconBolt,
  IconSearch,
  IconCalendar,
  IconFileText,
  IconFolder,
  IconAlertCircle,
  IconCamera,
  IconChevronLeft,
  IconChevronRight,
  IconCircleCheckFilled,
  IconCopy,
  IconDownload,
  IconHeart,
  IconInfoCircle,
  IconKey,
  IconLayoutSidebar,
  IconMapPin,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconMaximize,
  IconMinus,
  IconMusic,
  IconPhoto,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlus,
  IconVolume,
  IconVolumeOff,
  IconZoomReset,
  IconPresentation,
  IconShieldLock,
  IconStack2,
  IconTable,
  IconTag,
  IconTrash,
  IconVideo,
  IconX,
} from "@tabler/icons-react"
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore optional dependency: present only when NUCLEO_LICENSE_KEY is set at install time
import * as coreFill24 from "nucleo-core-fill-24"
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore optional dependency: present only when NUCLEO_LICENSE_KEY is set at install time
import * as uiFillDuo18 from "nucleo-ui-fill-duo-18"

export type IconProps = { className?: string }
type IconComponent = ComponentType<IconProps>

const pack: Record<string, IconComponent | undefined> = {
  ...(coreFill24 as Record<string, IconComponent | undefined>),
  ...(uiFillDuo18 as Record<string, IconComponent | undefined>),
}

/**
 * Nucleo Core fill-24 export names per semantic key, in preference order.
 * Nucleo names components as `Icon<Name><Style><Size>`; the first candidate
 * that exists in either installed pack wins, else the key falls through to
 * Tabler. Verified against nucleo-core-fill-24@1.1.3 (content icons) and
 * nucleo-ui-fill-duo-18@1.4.0 (UI/interface icons).
 */
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
}

/** Tabler fallbacks, used when no Nucleo icon resolves for the key. */
const tablerIcons: Record<string, IconComponent> = {
  bolt: IconBolt,
  search: IconSearch,
  photo: IconPhoto,
  folder: IconFolder,
  "folder-open": IconFolder,
  "folder-lock": IconFolder,
  "file-text": IconFileText,
  document: IconFileText,
  "file-zip": IconFileText,
  "file-pdf": IconFileText,
  database: IconFileText,
  table: IconTable,
  presentation: IconPresentation,
  calendar: IconCalendar,
  video: IconVideo,
  key: IconKey,
  "shield-lock": IconShieldLock,
  albums: IconStack2,
  favourites: IconHeart,
  trash: IconTrash,
  tag: IconTag,
  "images-3": IconPhoto,
  "album-3": IconStack2,
  "image-upscale": IconPhoto,
  "image-scale": IconPhoto,
  "window-left": IconLayoutSidebar,
  "layout-left": IconLayoutSidebarLeftCollapse,
  "tile-to-left": IconLayoutSidebarLeftCollapse,
  "sidebar-left-2-show": IconLayoutSidebarLeftExpand,
  "sidebar-left-2-hide": IconLayoutSidebarLeftCollapse,
  "circle-check": IconCircleCheckFilled,
  "circle-warning": IconAlertCircle,
  duplicate: IconCopy,
  "nav-back": IconChevronLeft,
  "nav-forward": IconChevronRight,
  info: IconInfoCircle,
  xmark: IconX,
  download: IconDownload,
  camera: IconCamera,
  "map-pin": IconMapPin,
  plus: IconPlus,
  minus: IconMinus,
  "zoom-reset": IconZoomReset,
  play: IconPlayerPlayFilled,
  music: IconMusic,
  "media-play": IconPlayerPlayFilled,
  "media-pause": IconPlayerPauseFilled,
  volume: IconVolume,
  "volume-mute": IconVolumeOff,
  fullscreen: IconMaximize,
  gauge: IconGauge,
  users: IconUsers,
  "users-group": IconUsersGroup,
  "user-shield": IconShield,
  sliders: IconAdjustments,
  settings: IconSettings,
  apps: IconLayoutGrid,
  palette: IconPalette,
  list: IconList,
  ban: IconBan,
}

const resolveNucleo = (name: string): IconComponent | undefined => {
  for (const candidate of nucleoCandidates[name] ?? []) {
    const Resolved = pack[candidate]
    if (Resolved) return Resolved
  }
  return undefined
}

/** Resolve an icon by key: Nucleo first (if installed), then Tabler, then a generic fallback. */
export const Icon = ({ name, className }: { name: string; className?: string }) => {
  const Resolved = resolveNucleo(name) ?? tablerIcons[name] ?? IconApps
  return <Resolved className={className} />
}
