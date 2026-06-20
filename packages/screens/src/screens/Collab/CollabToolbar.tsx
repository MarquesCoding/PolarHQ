import { usePathname, useNavigation } from "@workspace/screens/platform"
import { type DocType } from "@workspace/core/docs"
import { createEncryptedDoc } from "@workspace/core/e2e"
import { usePersistentNumber } from "@workspace/screens/persistentSetting"
import { Plus } from "@phosphor-icons/react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import ImportButton from "@components/ImportButton/ImportButton"
import SizeControl from "@pages/Photos/components/SizeControl/SizeControl"

export interface CollabToolbarConfig {
  type: DocType
  route: string
  createLabel: string
}

/** Title-bar controls for a collaborative-doc list page: tile-size slider + create. */
const CollabToolbar = ({ type, route, createLabel }: CollabToolbarConfig) => {
  const { t } = useTranslation("collab")
  const pathname = usePathname()
  const router = useNavigation()
  const queryClient = useQueryClient()
  const [tileSize, setTileSize] = usePersistentNumber(`${type}.tileSize`, 150)

  if (pathname !== route) return null

  const create = async () => {
    try {
      const doc = await createEncryptedDoc(null, type)
      void queryClient.invalidateQueries({ queryKey: ["docs"] })
      router.push(`${route}/${doc.id}`)
    } catch {
      toast.error(t("collabToolbar.createFailed"))
    }
  }

  return (
    <div className="flex items-center gap-2">
      <SizeControl value={tileSize} onChange={setTileSize} />
      <ImportButton type={type} />
      <Button size="sm" onClick={() => void create()}>
        <Plus className="size-4" />
        {createLabel}
      </Button>
    </div>
  )
}

export default CollabToolbar
