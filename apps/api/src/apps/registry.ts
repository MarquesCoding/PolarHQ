export type AppCategory = "storage" | "productivity" | "communication" | "security" | "system"
export type AppPrivacy = "server-side" | "e2e"
export type AppStatus = "available" | "coming_soon"

export interface AppManifest {
  id: string
  name: string
  description: string
  /** Icon token mapped to a Tabler icon on the client. */
  icon: string
  route: string
  category: AppCategory
  privacy: AppPrivacy
  status: AppStatus
  /** Marks an app as still in beta (shown as a badge in the launcher and app chrome). */
  beta?: boolean
  requiredPermission?: string
}

const registry = new Map<string, AppManifest>()

export const registerApp = (manifest: AppManifest): void => {
  registry.set(manifest.id, manifest)
}

export const listApps = (): AppManifest[] => [...registry.values()]

/** The suite's apps. Photos is live; the rest are declared as coming soon. */
export const SUITE_APPS: AppManifest[] = [
  {
    id: "photos",
    name: "Photos",
    description: "Back up, browse, and search your photos",
    icon: "photo",
    route: "/photos",
    category: "storage",
    privacy: "server-side",
    status: "available",
    beta: true,
    requiredPermission: "photos.asset.read",
  },
  {
    id: "drive",
    name: "Drive",
    description: "Your files, synced and shareable",
    icon: "folder",
    route: "/drive",
    category: "storage",
    privacy: "server-side",
    status: "available",
    beta: true,
    requiredPermission: "drive.file.read",
  },
  {
    id: "docs",
    name: "Docs",
    description: "Write and collaborate on documents",
    icon: "file-text",
    route: "/docs",
    category: "productivity",
    privacy: "e2e",
    status: "available",
    beta: true,
    requiredPermission: "docs.document.read",
  },
  {
    id: "sheets",
    name: "Sheets",
    description: "Spreadsheets and data",
    icon: "table",
    route: "/sheets",
    category: "productivity",
    privacy: "e2e",
    status: "available",
    beta: true,
    requiredPermission: "docs.document.read",
  },
  {
    id: "whiteboard",
    name: "Whiteboard",
    description: "An infinite collaborative canvas for sketches and diagrams",
    icon: "palette",
    route: "/whiteboards",
    category: "productivity",
    privacy: "e2e",
    status: "available",
    beta: true,
    requiredPermission: "docs.document.read",
  },
  {
    id: "calendar",
    name: "Calendar",
    description: "Schedule and plan your time",
    icon: "calendar",
    route: "/calendar",
    category: "productivity",
    privacy: "server-side",
    status: "coming_soon",
  },
  {
    id: "meet",
    name: "Meet",
    description: "Video calls and meetings",
    icon: "video",
    route: "/meet",
    category: "communication",
    privacy: "e2e",
    status: "coming_soon",
  },
  {
    id: "passwords",
    name: "Passwords",
    description: "Your end-to-end encrypted vault",
    icon: "key",
    route: "/passwords",
    category: "security",
    privacy: "e2e",
    status: "coming_soon",
  },
  {
    id: "authenticator",
    name: "Authenticator",
    description: "Two-factor codes, end-to-end encrypted",
    icon: "shield-lock",
    route: "/authenticator",
    category: "security",
    privacy: "e2e",
    status: "coming_soon",
  },
  {
    id: "admin",
    name: "Admin",
    description: "Manage users, apps, limits, and instance settings",
    icon: "shield-lock",
    route: "/admin",
    category: "system",
    privacy: "server-side",
    status: "available",
    requiredPermission: "admin.instance.manage",
  },
]

export const registerAppsModule = (): void => {
  for (const app of SUITE_APPS) registerApp(app)
}
