// Merge a flat map of dot-keys -> English into a namespace catalog (nested, sorted).
// Usage: node scripts/i18n-merge.mjs <namespace> <flat-keys.json>
import { readFileSync, writeFileSync } from "node:fs"

const [ns, flatPath] = process.argv.slice(2)
if (!ns || !flatPath) {
  console.error("usage: node scripts/i18n-merge.mjs <namespace> <flat-keys.json>")
  process.exit(1)
}
const target = `apps/web/lib/i18n/locales/en/${ns}.json`
const flat = JSON.parse(readFileSync(flatPath, "utf8"))
const existing = JSON.parse(readFileSync(target, "utf8"))

const setDeep = (obj, dotted, val) => {
  const parts = dotted.split(".")
  let cur = obj
  for (let i = 0; i < parts.length - 1; i += 1) {
    cur[parts[i]] ??= {}
    if (typeof cur[parts[i]] !== "object") {
      console.error(`collision at "${dotted}" — "${parts.slice(0, i + 1).join(".")}" is already a string`)
      process.exit(1)
    }
    cur = cur[parts[i]]
  }
  cur[parts[parts.length - 1]] = val
}
for (const [k, v] of Object.entries(flat)) setDeep(existing, k, v)

const sortDeep = (o) =>
  Object.fromEntries(
    Object.keys(o)
      .sort()
      .map((k) => [k, o[k] && typeof o[k] === "object" && !Array.isArray(o[k]) ? sortDeep(o[k]) : o[k]]),
  )

writeFileSync(target, JSON.stringify(sortDeep(existing), null, 2) + "\n")
console.log(`merged ${Object.keys(flat).length} keys into ${target}`)
