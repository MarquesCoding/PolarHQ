import { useCallback, useState } from "react"
import { uploadAsset } from "@polarhq/vault/photos"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

/** Upload one or more files, reporting progress via toasts. */
export const useUploader = (onDone: () => void) => {
  const { t } = useTranslation("common")
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
          toast.error(t("useUploader.uploadFailed", { name: file.name }))
        }
      }
      setBusy(false)

      if (uploaded > 0) toast.success(t("useUploader.uploaded", { count: uploaded }))
      if (deduped > 0) toast.message(t("useUploader.alreadyInLibrary", { count: deduped }))
      onDone()
    },
    [onDone, t],
  )

  return { uploadFiles, busy }
}
