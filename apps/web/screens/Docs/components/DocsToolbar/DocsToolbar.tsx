"use client"

import { usePathname, useRouter } from "next/navigation"
import { createDoc } from "@lib/docs"
import { usePersistentNumber } from "@lib/persistentSetting"
import { IconFilePlus } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { toast } from "sonner"
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
      const doc = await createDoc()
      void queryClient.invalidateQueries({ queryKey: ["docs"] })
      router.push(`/docs/${doc.id}`)
    } catch {
      toast.error("Could not create document")
    }
  }

  return (
    <div className="flex items-center gap-2">
      <SizeControl value={tileSize} onChange={setTileSize} />
      <Button size="sm" onClick={() => void newDocument()}>
        <IconFilePlus className="size-4" />
        New document
      </Button>
    </div>
  )
}

export default DocsToolbar
