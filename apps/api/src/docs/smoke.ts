import { db, schema } from "@workspace/db"
import { storage } from "@workspace/storage"
import { and, eq } from "drizzle-orm"
import { DOC_MIME, createDoc, getDocContent, listDocs, saveDocContent } from "./service"

const OWNER = "Lp56fUcCBVMwKhhOJKrsOpXyc9L6Byic"

const run = async () => {
  console.log("1) createDoc")
  const doc = await createDoc(OWNER, null, "Smoke Doc")
  console.log("   ->", { id: doc.id, name: doc.name, mime: doc.mimeType, size: doc.sizeBytes })
  if (doc.mimeType !== DOC_MIME) throw new Error("mime mismatch")

  console.log("2) getDocContent (fresh, expect 0 bytes)")
  const fresh = await getDocContent(OWNER, doc.id)
  console.log("   ->", fresh ? `${fresh.bytes.length} bytes` : "null")
  if (!fresh || fresh.bytes.length !== 0) throw new Error("expected empty content")

  console.log("3) saveDocContent")
  const payload = Buffer.from("hello-yjs-snapshot")
  await saveDocContent(OWNER, doc.id, payload)

  console.log("4) getDocContent (after save, expect roundtrip)")
  const after = await getDocContent(OWNER, doc.id)
  console.log("   ->", after ? after.bytes.toString() : "null")
  if (!after || after.bytes.toString() !== payload.toString()) throw new Error("roundtrip mismatch")

  console.log("5) listDocs includes it")
  const docs = await listDocs(OWNER)
  const found = docs.some((d) => d.id === doc.id)
  console.log("   ->", found, `(${docs.length} docs total)`)
  if (!found) throw new Error("not in listDocs")

  console.log("6) cleanup")
  if (after.node.storageKey) await storage().delete(after.node.storageKey).catch(() => undefined)
  await db
    .delete(schema.nodes)
    .where(and(eq(schema.nodes.ownerId, OWNER), eq(schema.nodes.id, doc.id)))
  console.log("   removed node + object")

  console.log("\nALL CHECKS PASSED")
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("SMOKE FAILED:", error)
    process.exit(1)
  })
