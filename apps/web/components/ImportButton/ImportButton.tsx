import { useRef, useState } from "react"
import { useNavigation } from "@workspace/screens/platform"
import { type DocType } from "@workspace/core/docs"
import { importFile } from "@workspace/screens/importFlow"
import { useQueryClient } from "@tanstack/react-query"
import { FileArrowDown } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

/** File-picker filter per document type. */
const ACCEPT: Record<DocType, string> = {
  sheet: ".xlsx,.xls,.csv,.tsv,.ods",
  doc: ".docx,.txt,.md,.markdown",
  board: ".json",
}

/** Imports an Office/Google file (.xlsx, .docx, .pptx, …) into a new document of `type`. */
const ImportButton = ({ type }: { type: DocType }) => {
  const { t } = useTranslation("common")
  const router = useNavigation()
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const onPick = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      await importFile(file, type, router)
      void queryClient.invalidateQueries({ queryKey: ["docs"] })
    } catch {
      toast.error(t("importButton.importFailed"))
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <FileArrowDown className="size-4" />
        {t("importButton.import")}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[type]}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => void onPick(event.target.files?.[0])}
      />
    </>
  )
}

export default ImportButton
