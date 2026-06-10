"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { type DocType } from "@lib/docs"
import { importFile } from "@lib/importFlow"
import { useQueryClient } from "@tanstack/react-query"
import { IconFileImport } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import { toast } from "sonner"

/** File-picker filter per document type. */
const ACCEPT: Record<DocType, string> = {
  sheet: ".xlsx,.xls,.csv,.tsv,.ods",
  doc: ".docx,.txt,.md,.markdown",
}

/** Imports an Office/Google file (.xlsx, .docx, .pptx, …) into a new document of `type`. */
const ImportButton = ({ type }: { type: DocType }) => {
  const router = useRouter()
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
      toast.error("Could not import this file")
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
        <IconFileImport className="size-4" />
        Import
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
