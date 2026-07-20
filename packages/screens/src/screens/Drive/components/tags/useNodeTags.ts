import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  type DriveNode,
  type DriveTag,
  applyDriveTag,
  createDriveTag,
  fetchDriveTags,
  removeDriveTag,
} from "@workspace/core/drive"

/** The colour palette offered when creating a tag. */
export const TAG_COLORS = [
  "#e11d48",
  "#f59e0b",
  "#22c55e",
  "#3b6cf6",
  "#8b6cfb",
  "#ec4899",
  "#14b8a6",
  "#64748b",
]

/** Shared tag controls for a single node — the full tag list, which are applied, and toggle/create
 *  helpers that keep Drive queries fresh. */
export const useNodeTags = (node: Pick<DriveNode, "id" | "tags">) => {
  const queryClient = useQueryClient()
  const { data: allTags = [] } = useQuery({ queryKey: ["drive", "tags"], queryFn: fetchDriveTags })
  const applied = new Set((node.tags ?? []).map((tag) => tag.id))

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["drive"] })

  const toggle = async (tag: DriveTag) => {
    if (applied.has(tag.id)) await removeDriveTag(node.id, tag.id)
    else await applyDriveTag(node.id, tag.id)
    invalidate()
  }

  const create = async (name: string, color: string) => {
    const { tag } = await createDriveTag(name, color)
    await applyDriveTag(node.id, tag.id)
    invalidate()
  }

  return { allTags, applied, toggle, create }
}
