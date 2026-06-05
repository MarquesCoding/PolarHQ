"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatBytes } from "@lib/format"
import { type DocMeta, createDoc, fetchDocs } from "@lib/docs"
import { useAppSelector } from "@store/hooks"
import { IconFileText, IconPlus } from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { toast } from "sonner"
import { PageSpinner } from "@components/Spinner/Spinner"

/** The Docs home: a grid of the user's documents with a create-new action. */
const DocsList = () => {
  const router = useRouter()
  const search = useAppSelector((state) => state.ui.searchQuery).trim().toLowerCase()
  const [creating, setCreating] = useState(false)
  const { data, isLoading } = useQuery({ queryKey: ["docs", "list"], queryFn: fetchDocs })

  const create = async () => {
    setCreating(true)
    try {
      const doc = await createDoc()
      router.push(`/docs/${doc.id}`)
    } catch {
      toast.error("Could not create document")
      setCreating(false)
    }
  }

  const docs = data ?? []
  const visible = search ? docs.filter((doc) => doc.name.toLowerCase().includes(search)) : docs

  return (
    <div className="flex flex-1 flex-col gap-5 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Documents</h1>
        <Button size="sm" disabled={creating} onClick={create}>
          <IconPlus className="size-4" />
          New document
        </Button>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : visible.length === 0 ? (
        <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <IconFileText className="size-8" />
          <p className="text-sm">
            {search ? "No documents match your search." : "No documents yet — create one to start."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-4">
          {visible.map((doc) => (
            <DocCard key={doc.id} doc={doc} onOpen={() => router.push(`/docs/${doc.id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}

const DocCard = ({ doc, onOpen }: { doc: DocMeta; onOpen: () => void }) => (
  <button
    type="button"
    onClick={onOpen}
    className="group flex flex-col gap-2 text-left"
  >
    <div className="bg-card group-hover:border-primary/40 flex aspect-[4/5] items-center justify-center rounded-xl border transition">
      <IconFileText className="text-sky-400 size-12" />
    </div>
    <div className="flex flex-col">
      <span className="truncate text-sm font-medium">{doc.name}</span>
      <span className="text-muted-foreground text-xs">
        {new Date(doc.updatedAt).toLocaleDateString()} · {formatBytes(doc.sizeBytes ?? 0)}
      </span>
    </div>
  </button>
)

export default DocsList
