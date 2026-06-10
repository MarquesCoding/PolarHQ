// Generates packages/changelog/src/releases.generated.ts from the repo-root CHANGELOG.md.
// Run via `pnpm --filter @workspace/changelog generate`. CHANGELOG.md is the single source
// of truth (maintained by release-please + optional hand polishing); this keeps the in-app
// and marketing-site changelog in sync with it.

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const CHANGELOG = resolve(here, "../../../CHANGELOG.md")
const OUT = resolve(here, "../src/releases.generated.ts")

const SEMVER = /(\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?)/
const DATE = /(\d{4}-\d{2}-\d{2})/

const parse = (markdown) => {
  const lines = markdown.split("\n")
  const releases = []
  let current = null

  const commit = () => {
    if (!current) return
    const tagLine = current.body.find((line) => /<!--\s*tags:/i.test(line))
    const tags = tagLine
      ? tagLine
          .replace(/<!--\s*tags:/i, "")
          .replace(/-->/, "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : undefined
    const content = current.body
      .filter((line) => !/<!--\s*tags:/i.test(line))
      .join("\n")
      .trim()
    releases.push({ ...current.meta, ...(tags ? { tags } : {}), content })
    current = null
  }

  for (const line of lines) {
    const heading = line.match(/^##\s+(.*)$/)
    if (heading && SEMVER.test(heading[1])) {
      commit()
      const text = heading[1]
      const version = text.match(SEMVER)?.[1] ?? ""
      const date = text.match(DATE)?.[1] ?? ""
      const dash = text.indexOf("—")
      const title = dash !== -1 ? text.slice(dash + 1).trim() : undefined
      current = { meta: { version, date, ...(title ? { title } : {}) }, body: [] }
      continue
    }
    if (current) current.body.push(line)
  }
  commit()
  return releases
}

const markdown = readFileSync(CHANGELOG, "utf8")
const releases = parse(markdown)
if (releases.length === 0) throw new Error("No releases parsed from CHANGELOG.md")

const banner = "// AUTO-GENERATED from CHANGELOG.md by scripts/generate.mjs — do not edit by hand.\n"
const body = `import type { Release } from "./types"\n\nexport const RELEASES: Release[] = ${JSON.stringify(releases, null, 2)}\n`
writeFileSync(OUT, banner + body)
console.log(`Wrote ${releases.length} releases to ${OUT}`)
