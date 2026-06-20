import { usePathname, useNavigation } from "@workspace/screens/platform"
import { openEditor } from "@workspace/core/docs"
import { createEncryptedDoc } from "@workspace/core/e2e"
import { usePersistentNumber } from "@workspace/screens/persistentSetting"
import { FilePlus } from "@phosphor-icons/react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import ImportButton from "@components/ImportButton/ImportButton"
import SizeControl from "@pages/Photos/components/SizeControl/SizeControl"

/** Docs title-bar controls: a tile-size slider and create-document, shown only on the list page. */
const DocsToolbar = () => {
  const { t } = useTranslation("docs")
  const pathname = usePathname()
  const router = useNavigation()
  const queryClient = useQueryClient()
  const [tileSize, setTileSize] = usePersistentNumber("docs.tileSize", 150)

  if (pathname !== "/docs") return null

  const newDocument = async () => {
    try {
      const doc = await createEncryptedDoc()
      void queryClient.invalidateQueries({ queryKey: ["docs"] })
      openEditor("doc", doc.id, router)
    } catch {
      toast.error(t("docsToolbar.createError"))
    }
  }

  return (
    <div className="flex items-center gap-2">
      <SizeControl value={tileSize} onChange={setTileSize} />
      <ImportButton type="doc" />
      <Button size="sm" onClick={() => void newDocument()}>
        <FilePlus className="size-4" />
        {t("docsToolbar.newDocument")}
      </Button>
    </div>
  )
}

export default DocsToolbar
