import { type LimitDef, registerLimit } from "@polarhq/auth"

/**
 * The suite's tunable limits. Each is resolved per-user with precedence
 * user > group > instance default > systemDefault (null = unlimited).
 */
export const LIMIT_CATALOG: (LimitDef & { label: string; description: string })[] = [
  {
    key: "storage.quota.bytes",
    type: "bytes",
    strategy: "max",
    systemDefault: null,
    label: "Storage quota",
    description: "Total bytes a user may store across all apps (blank = unlimited).",
  },
  {
    key: "upload.maxFileBytes",
    type: "bytes",
    strategy: "min",
    systemDefault: null,
    label: "Max upload size",
    description: "Largest single file a user may upload (blank = unlimited).",
  },
  {
    key: "upload.rateBytesPerSec",
    type: "bytes",
    strategy: "min",
    systemDefault: null,
    label: "Upload speed limit",
    description: "Per-user upload throughput cap in bytes/sec (blank = unlimited).",
  },
]

export const registerLimitCatalog = (): void => {
  for (const def of LIMIT_CATALOG) registerLimit(def)
}
