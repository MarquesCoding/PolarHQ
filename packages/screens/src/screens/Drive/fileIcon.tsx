import type { ComponentType } from "react"
import type { IconProps } from "@phosphor-icons/react"
import {
  Cube,
  Database,
  File,
  FileAudio,
  FileDoc,
  FilePdf,
  FileText,
  FileVideo,
  FileXls,
  FileZip,
  Folder,
  House,
  ImageSquare,
  Package,
  Terminal,
} from "@phosphor-icons/react"
import type { DriveNode } from "@workspace/core/drive"
import { cn } from "@workspace/ui/lib/utils"

type IconSpec = { Icon: ComponentType<IconProps>; color: string }

const DOCUMENT: IconSpec = { Icon: File, color: "text-muted-foreground" }
const HOME: IconSpec = { Icon: House, color: "text-blue-500" }

/** File-type icons keyed by kind, each a colored fill-weight glyph. */
const ICONS: Record<string, IconSpec> = {
  Folder: { Icon: Folder, color: "text-blue-500" },
  Home: HOME,
  Document: DOCUMENT,
  Document_doc: { Icon: FileDoc, color: "text-blue-500" },
  Document_pdf: { Icon: FilePdf, color: "text-red-500" },
  Document_xls: { Icon: FileXls, color: "text-emerald-500" },
  Audio: { Icon: FileAudio, color: "text-fuchsia-500" },
  Video: { Icon: FileVideo, color: "text-indigo-500" },
  Archive: { Icon: FileZip, color: "text-amber-500" },
  Database: { Icon: Database, color: "text-slate-500" },
  Mesh: { Icon: Cube, color: "text-teal-500" },
  Image: { Icon: ImageSquare, color: "text-emerald-500" },
  Text: { Icon: FileText, color: "text-sky-500" },
  Package: { Icon: Package, color: "text-orange-500" },
  Executable: { Icon: Terminal, color: "text-zinc-500" },
}

const ARCHIVE = /\.(zip|tar|gz|tgz|rar|7z|bz2|xz|dmg)$/i
const DATABASE = /\.(db|sqlite|sqlite3|sql)$/i
const TEXTUAL = /\.(txt|md|json|ya?ml|toml|ini|log|js|ts|tsx|jsx|py|rb|go|rs|c|cpp|h|java|css|html|xml|sh)$/i
const MODEL3D = /\.(stl|obj|ply|fbx|gltf|glb)$/i

/** Map a Drive node to an icon key. */
const iconKeyFor = (node: DriveNode): string => {
  const name = node.name.toLowerCase()
  const mime = node.mimeType ?? ""
  if (node.kind === "folder") return "Folder"
  if (mime === "application/vnd.orbit.doc") return "Document_doc"
  if (mime === "application/vnd.orbit.sheet") return "Document_xls"
  if (mime === "application/vnd.orbit.board") return "Image"
  if (/\.(xlsx|xls|csv|tsv|ods)$/i.test(name)) return "Document_xls"
  if (/\.docx$/i.test(name)) return "Document_doc"
  if (mime.startsWith("audio/")) return "Audio"
  if (mime.startsWith("video/")) return "Video"
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "Document_pdf"
  if (ARCHIVE.test(name)) return "Archive"
  if (DATABASE.test(name)) return "Database"
  if (MODEL3D.test(name)) return "Mesh"
  if (mime.startsWith("image/")) return "Image"
  if (mime.startsWith("text/") || TEXTUAL.test(name)) return "Text"
  return "Document"
}

/** A file-type icon for a Drive node. */
export const FileIcon = ({ node, className }: { node: DriveNode; className?: string }) => {
  const { Icon, color } = ICONS[iconKeyFor(node)] ?? DOCUMENT
  return <Icon weight="fill" className={cn(color, className)} />
}

/** Icon for the parent (".." up one level) entry. */
export const ParentIcon = ({ className }: { className?: string }) => {
  const { Icon, color } = HOME
  return <Icon weight="fill" className={cn(color, className)} />
}
