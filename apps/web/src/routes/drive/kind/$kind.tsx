import { createFileRoute } from "@tanstack/react-router"
import type { StorageKind } from "@lib/drive"
import Browser from "@pages/Drive/Browser"

const KINDS: StorageKind[] = ["image", "video", "audio", "document", "archive", "other"]

const RouteComponent = () => {
  const { kind } = Route.useParams()
  const valid = (KINDS as string[]).includes(kind) ? (kind as StorageKind) : "other"
  return <Browser source={{ view: "kind", kind: valid }} />
}

export const Route = createFileRoute("/drive/kind/$kind")({ component: RouteComponent })
