export type RoadmapStatus = "shipped" | "in-progress" | "planned" | "exploring"

export interface RoadmapItem {
  title: string
  description: string
}

export interface RoadmapColumn {
  status: RoadmapStatus
  label: string
  blurb: string
  items: RoadmapItem[]
}

export const ROADMAP: RoadmapColumn[] = [
  {
    status: "shipped",
    label: "Shipped",
    blurb: "Live today in the current alpha.",
    items: [
      { title: "End-to-end encryption", description: "Proton-style single password, libsodium, ciphertext-only server." },
      { title: "Photos", description: "Continuous-flow grid, HEIC & Live Photos, EXIF maps, editor, stacks." },
      { title: "On-device semantic search", description: "CLIP embeddings computed locally, encrypted, ranked client-side." },
      { title: "Drive", description: "Folders, versioning, trash, shared storage with Photos." },
      { title: "Docs, Sheets & Slides", description: "Full-screen editors with Office import/export." },
      { title: "Native iOS app", description: "SwiftUI client with byte-for-byte crypto parity." },
      { title: "Live sync", description: "Real-time updates across web and mobile." },
      { title: "Admin console", description: "Users, groups, limits, roles, branding, audit log." },
    ],
  },
  {
    status: "in-progress",
    label: "In progress",
    blurb: "Being built right now.",
    items: [
      { title: "Real-time doc collaboration", description: "Presence cursors and comments over the encrypted relay." },
      { title: "Sharing & public links", description: "Wrap content keys to collaborators; opt-in public views." },
      { title: "One-command deploy", description: "A single docker-compose to stand the whole suite up." },
    ],
  },
  {
    status: "planned",
    label: "Planned",
    blurb: "Designed and queued.",
    items: [
      { title: "Android app", description: "A native client to match iOS, sharing the same crypto core." },
      { title: "Background & offline", description: "Background upload and offline caching on mobile." },
      { title: "S3 backups", description: "Scheduled encrypted backups to any S3-compatible bucket." },
      { title: "Workgroups", description: "Shared spaces and per-group storage limits." },
    ],
  },
  {
    status: "exploring",
    label: "Exploring",
    blurb: "Ideas we're weighing for the suite.",
    items: [
      { title: "Calendar & Mail", description: "Rounding out the suite with the everyday essentials." },
      { title: "Notes & Tasks", description: "Lightweight capture that lives in the same encrypted tree." },
      { title: "Federation", description: "Sharing across independently hosted PolarHQ servers." },
    ],
  },
]
