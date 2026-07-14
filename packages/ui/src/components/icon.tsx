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
import { Desktop } from "@phosphor-icons/react/Desktop"
import { DeviceMobile } from "@phosphor-icons/react/DeviceMobile"
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
import { Laptop } from "@phosphor-icons/react/Laptop"
import { Table } from "@phosphor-icons/react/Table"
import { Tag } from "@phosphor-icons/react/Tag"
import { Trash } from "@phosphor-icons/react/Trash"
import { User } from "@phosphor-icons/react/User"
import { Users } from "@phosphor-icons/react/Users"
import { UsersThree } from "@phosphor-icons/react/UsersThree"
import { VideoCamera } from "@phosphor-icons/react/VideoCamera"
import { WarningCircle } from "@phosphor-icons/react/WarningCircle"
import { X } from "@phosphor-icons/react/X"

export type IconProps = { className?: string }
type IconComponent = ComponentType<IconProps>

/**
 * Semantic icon key → @phosphor-icons/react component. Where Phosphor has no exact match the closest
 * verified icon is used.
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
  laptop: Laptop,
  desktop: Desktop,
  "device-mobile": DeviceMobile,
  user: User,
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
  const Resolved = icons[name] ?? SquaresFour
  return <Resolved className={className} />
}
