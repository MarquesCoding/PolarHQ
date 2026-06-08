"use client"

import { usePathname, useRouter } from "next/navigation"
import { openEditor } from "@lib/docs"
import { createEncryptedDoc } from "@lib/e2e"
import { usePersistentNumber } from "@lib/persistentSetting"
import { IconFilePlus } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { toast } from "sonner"
import ImportButton from "@components/ImportButton/ImportButton"
import SizeControl from "@pages/Photos/components/SizeControl/SizeControl"

/** Docs title-bar controls: a tile-size slider and create-document, shown only on the list page. */
const DocsToolbar = () => {
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [tileSize, setTileSize] = usePersistentNumber("docs.tileSize", 150)

  if (pathname !== "/docs") return null

  const newDocument = async () => {
    try {
      const doc = await createEncryptedDoc()
      void queryClient.invalidateQueries({ queryKey: ["docs"] })
      openEditor("doc", doc.id, router)
    } catch {
      toast.error("Could not create document")
    }
  }

  return (
    <div className="flex items-center gap-2">
      <SizeControl value={tileSize} onChange={setTileSize} />
      <ImportButton type="doc" />
      <Button size="sm" onClick={() => void newDocument()}>
        <IconFilePlus className="size-4" />
        New document
      </Button>
    </div>
  )
}

export default DocsToolbar
