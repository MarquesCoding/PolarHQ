import { config } from "@polarhq/config"

export interface UpdateInfo {
  current: string
  latest: string
  updateAvailable: boolean
  url: string
}

const TTL_MS = 6 * 60 * 60 * 1000
let cache: { at: number; data: UpdateInfo } | null = null

const parseSemver = (value: string): number[] =>
  value
    .replace(/^v/, "")
    .split("-")[0]!
    .split(".")
    .map((part) => parseInt(part, 10) || 0)

/** Returns >0 when a is newer than b, <0 when older, 0 when equal. */
const compareSemver = (a: string, b: string): number => {
  const pa = parseSemver(a)
  const pb = parseSemver(b)
  for (let i = 0; i < 3; i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff > 0 ? 1 : -1
  }
  return 0
}

/** Check GitHub for a newer release than the running version. Cached in-process for 6h. */
export const checkForUpdate = async (): Promise<UpdateInfo> => {
  const current = config.version
  const fallbackUrl = `https://github.com/${config.githubRepo}/releases`
  if (!config.updateCheck) {
    return { current, latest: current, updateAvailable: false, url: fallbackUrl }
  }
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data

  let data: UpdateInfo = { current, latest: current, updateAvailable: false, url: fallbackUrl }
  try {
    const response = await fetch(
      `https://api.github.com/repos/${config.githubRepo}/releases/latest`,
      { headers: { Accept: "application/vnd.github+json", "User-Agent": config.appName } },
    )
    if (response.ok) {
      const json = (await response.json()) as { tag_name?: string; html_url?: string }
      const latest = (json.tag_name ?? "").replace(/^v/, "") || current
      data = {
        current,
        latest,
        updateAvailable: compareSemver(latest, current) > 0,
        url: json.html_url ?? fallbackUrl,
      }
    }
  } catch {
    // Offline or rate-limited — report no update available.
  }
  cache = { at: Date.now(), data }
  return data
}
