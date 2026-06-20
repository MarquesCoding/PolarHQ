import type { DriveNode } from "@workspace/core/drive"
import { useTheme } from "@components/theme-provider"
import { cn } from "@workspace/ui/lib/utils"
import icon_Archive from "./fileIcons/Archive.png"
import icon_Archive_Light from "./fileIcons/Archive_Light.png"
import icon_Audio from "./fileIcons/Audio.png"
import icon_Audio_Light from "./fileIcons/Audio_Light.png"
import icon_Database from "./fileIcons/Database.png"
import icon_Database_Light from "./fileIcons/Database_Light.png"
import icon_Document from "./fileIcons/Document.png"
import icon_Document_Light from "./fileIcons/Document_Light.png"
import icon_Document_doc from "./fileIcons/Document_doc.png"
import icon_Document_doc_Light from "./fileIcons/Document_doc_Light.png"
import icon_Document_pdf from "./fileIcons/Document_pdf.png"
import icon_Document_pdf_Light from "./fileIcons/Document_pdf_Light.png"
import icon_Document_xls from "./fileIcons/Document_xls.png"
import icon_Document_xls_Light from "./fileIcons/Document_xls_Light.png"
import icon_Executable from "./fileIcons/Executable.png"
import icon_Executable_Light from "./fileIcons/Executable_Light.png"
import icon_Folder from "./fileIcons/Folder.png"
import icon_FolderGrey from "./fileIcons/FolderGrey.png"
import icon_FolderGrey_Light from "./fileIcons/FolderGrey_Light.png"
import icon_Folder_Light from "./fileIcons/Folder_Light.png"
import icon_Home from "./fileIcons/Home.png"
import icon_Home_Light from "./fileIcons/Home_Light.png"
import icon_Image from "./fileIcons/Image.png"
import icon_Image_Light from "./fileIcons/Image_Light.png"
import icon_Mesh from "./fileIcons/Mesh.png"
import icon_Mesh_Light from "./fileIcons/Mesh_Light.png"
import icon_Package from "./fileIcons/Package.png"
import icon_Package_Light from "./fileIcons/Package_Light.png"
import icon_Text from "./fileIcons/Text.png"
import icon_Text_Light from "./fileIcons/Text_Light.png"
import icon_Undefined from "./fileIcons/Undefined.png"
import icon_Undefined_Light from "./fileIcons/Undefined_Light.png"
import icon_Video from "./fileIcons/Video.png"
import icon_Video_Light from "./fileIcons/Video_Light.png"

/** File-type icons, with dark + _Light variants. */
const ICONS: Record<string, string> = {
  "Archive": icon_Archive,
  "Archive_Light": icon_Archive_Light,
  "Audio": icon_Audio,
  "Audio_Light": icon_Audio_Light,
  "Database": icon_Database,
  "Database_Light": icon_Database_Light,
  "Document": icon_Document,
  "Document_Light": icon_Document_Light,
  "Document_doc": icon_Document_doc,
  "Document_doc_Light": icon_Document_doc_Light,
  "Document_pdf": icon_Document_pdf,
  "Document_pdf_Light": icon_Document_pdf_Light,
  "Document_xls": icon_Document_xls,
  "Document_xls_Light": icon_Document_xls_Light,
  "Executable": icon_Executable,
  "Executable_Light": icon_Executable_Light,
  "Folder": icon_Folder,
  "FolderGrey": icon_FolderGrey,
  "FolderGrey_Light": icon_FolderGrey_Light,
  "Folder_Light": icon_Folder_Light,
  "Home": icon_Home,
  "Home_Light": icon_Home_Light,
  "Image": icon_Image,
  "Image_Light": icon_Image_Light,
  "Mesh": icon_Mesh,
  "Mesh_Light": icon_Mesh_Light,
  "Package": icon_Package,
  "Package_Light": icon_Package_Light,
  "Text": icon_Text,
  "Text_Light": icon_Text_Light,
  "Undefined": icon_Undefined,
  "Undefined_Light": icon_Undefined_Light,
  "Video": icon_Video,
  "Video_Light": icon_Video_Light,
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

/** A file-type icon for a Drive node, using the theme-appropriate PNG. */
export const FileIcon = ({ node, className }: { node: DriveNode; className?: string }) => {
  const { resolvedTheme } = useTheme()
  const key = iconKeyFor(node)
  const variant = resolvedTheme === "light" ? `${key}_Light` : key
  const src = ICONS[variant] ?? ICONS[key] ?? ICONS.Document
  return <img src={src} alt="" draggable={false} className={cn("object-contain", className)} />
}

/** Icon for the parent (".." up one level) entry — the Home icon. */
export const ParentIcon = ({ className }: { className?: string }) => {
  const { resolvedTheme } = useTheme()
  const src = resolvedTheme === "light" ? ICONS.Home_Light : ICONS.Home
  return <img src={src} alt="" draggable={false} className={cn("object-contain", className)} />
}
