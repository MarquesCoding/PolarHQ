const ts = require("typescript")
const fs = require("fs")
const { execSync } = require("child_process")

const APPLY = process.argv.includes("--apply")

const DIRECTIVE =
  /^\/[/*]\s*(eslint-|eslint\b|@ts-|ts-|biome-ignore|prettier-ignore|v8 ignore|c8 |istanbul|@__PURE__|#__PURE__|webpack|@vite|globalThis|deno-|<reference|noinspection)/i

const isTsDoc = (text) => text.startsWith("/**") && text !== "/**/"
const isDirective = (text) => DIRECTIVE.test(text)

const listFiles = () =>
  execSync(
    "find apps/web apps/api apps/marketing packages services -type f \\( -name '*.ts' -o -name '*.tsx' \\)",
    { encoding: "utf8", maxBuffer: 1 << 26 },
  )
    .split("\n")
    .filter(Boolean)
    .filter((f) => !/\/(\.next|node_modules|dist|drizzle|\.turbo)\//.test(f) && !f.endsWith(".d.ts"))

const isWs = (s) => /^\s*$/.test(s)

const processFile = (file) => {
  const text = fs.readFileSync(file, "utf8")
  const tsx = file.endsWith(".tsx")
  const sf = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    tsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )

  const protectedRanges = []
  const jsxComments = []
  const walk = (node) => {
    if (node.kind === ts.SyntaxKind.JsxExpression && !node.expression) {
      jsxComments.push([node.getStart(sf), node.getEnd()])
    }
    if (
      (node.kind === ts.SyntaxKind.Block || node.kind === ts.SyntaxKind.ModuleBlock) &&
      node.statements.length === 0
    ) {
      protectedRanges.push([node.getStart(sf), node.getEnd()])
    }
    node.forEachChild(walk)
  }
  walk(sf)
  const inProtected = (s, e) => protectedRanges.some(([a, b]) => s >= a && e <= b)
  const inJsx = (s, e) => jsxComments.some(([a, b]) => s >= a && e <= b)

  const commentRanges = new Map()
  const addRanges = (arr) => {
    if (!arr) return
    for (const r of arr) commentRanges.set(r.pos, [r.pos, r.end])
  }
  const tokenWalk = (node) => {
    if (node.getChildCount(sf) === 0) {
      addRanges(ts.getLeadingCommentRanges(text, node.getFullStart()))
      addRanges(ts.getTrailingCommentRanges(text, node.getEnd()))
    } else {
      for (const child of node.getChildren(sf)) tokenWalk(child)
    }
  }
  tokenWalk(sf)

  const removals = []
  for (const [start, end] of commentRanges.values()) {
    const ctext = text.slice(start, end)
    if (isTsDoc(ctext) || isDirective(ctext) || inProtected(start, end) || inJsx(start, end)) continue
    removals.push([start, end])
  }
  for (const [s, e] of jsxComments) removals.push([s, e])

  if (removals.length === 0) return { file, removed: 0, text }

  removals.sort((a, b) => b[0] - a[0])
  let out = text
  for (const [s, e] of removals) {
    const lineStart = out.lastIndexOf("\n", s - 1) + 1
    const nextNL = out.indexOf("\n", e)
    const lineEnd = nextNL === -1 ? out.length : nextNL
    const before = out.slice(lineStart, s)
    const after = out.slice(e, lineEnd)
    if (isWs(before) && isWs(after)) {
      out = out.slice(0, lineStart) + out.slice(nextNL === -1 ? lineEnd : lineEnd + 1)
    } else {
      let cut = s
      while (cut > lineStart && (out[cut - 1] === " " || out[cut - 1] === "\t")) cut--
      out = out.slice(0, cut) + out.slice(e)
    }
  }
  out = out.replace(/\n{3,}/g, "\n\n")
  return { file, removed: removals.length, text: out, changed: out !== text }
}

let totalFiles = 0
let totalRemoved = 0
const samples = []
for (const file of listFiles()) {
  const r = processFile(file)
  if (r.removed > 0 && r.changed) {
    totalFiles += 1
    totalRemoved += r.removed
    if (APPLY) fs.writeFileSync(file, r.text)
    else if (samples.length < 8) samples.push(`${file}: ${r.removed}`)
  }
}
console.log(`${APPLY ? "APPLIED" : "DRY-RUN"}: ${totalRemoved} comments across ${totalFiles} files`)
if (!APPLY) console.log(samples.join("\n"))
