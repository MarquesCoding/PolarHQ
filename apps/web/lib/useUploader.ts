import { useCallback, useState } from "react"
import { uploadAsset } from "@lib/photos"
import { toast } from "sonner"

/** Upload one or more files, reporting progress via toasts. */
export const useUploader = (onDone: () => void) => {
  const [busy, setBusy] = useState(false)

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files)
      if (list.length === 0) return

      setBusy(true)
      let uploaded = 0
      let deduped = 0
      for (const file of list) {
        try {
          const result = await uploadAsset(file)
          if (result.deduped) deduped += 1
          else uploaded += 1
        } catch {
          toast.error(`Failed to upload ${file.name}`)
        }
      }
      setBusy(false)

      if (uploaded > 0) toast.success(`Uploaded ${uploaded} photo${uploaded === 1 ? "" : "s"}`)
      if (deduped > 0) toast.message(`${deduped} already in your library`)
      onDone()
    },
    [onDone],
  )

  return { uploadFiles, busy }
}
