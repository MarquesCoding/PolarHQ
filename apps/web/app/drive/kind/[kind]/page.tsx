import type { StorageKind } from "@lib/drive"
import Browser from "@pages/Drive/Browser"

const KINDS: StorageKind[] = ["image", "video", "audio", "document", "archive", "other"]

const Page = async ({ params }: { params: Promise<{ kind: string }> }) => {
  const { kind } = await params
  const valid = (KINDS as string[]).includes(kind) ? (kind as StorageKind) : "other"
  return <Browser source={{ view: "kind", kind: valid }} />
}

export default Page
