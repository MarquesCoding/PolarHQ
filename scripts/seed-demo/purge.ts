/**
 * Delete ALL photos from the signed-in account (trash everything, then empty trash). Used to wipe a
 * bad seed before re-seeding.
 *
 *   API_URL=https://demo.polarhq.app EMAIL=demo@... PASSWORD=... \
 *     pnpm --filter @workspace/seed-demo exec tsx purge.ts
 */
import { coreConfig } from "@workspace/core/config"

import { connect, signIn } from "./lib"

const API_URL = process.env.API_URL ?? "http://localhost:3001"
const EMAIL = process.env.EMAIL ?? ""
const PASSWORD = process.env.PASSWORD ?? ""

let bearer = ""

const main = async () => {
  if (!EMAIL || !PASSWORD) throw new Error("set EMAIL and PASSWORD")
  connect(API_URL)
  await signIn(EMAIL, PASSWORD)
  // `signIn` set the token inside lib; grab it for our raw calls via a probe request header echo.
  // Simpler: re-sign here to capture the token locally.
  const res = await fetch(`${coreConfig().apiUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: coreConfig().apiUrl },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  bearer = res.headers.get("set-auth-token") ?? ((await res.json()) as { token?: string }).token ?? ""

  const authed = (path: string, init?: RequestInit) =>
    fetch(`${coreConfig().apiUrl}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${bearer}`, "content-type": "application/json", ...init?.headers },
    })

  let total = 0
  for (;;) {
    const page = (await (await authed("/api/v1/photos/assets?limit=200")).json()) as {
      assets: { id: string }[]
    }
    const ids = page.assets.map((a) => a.id)
    if (ids.length === 0) break
    await authed("/api/v1/photos/assets/actions/trash", {
      method: "POST",
      body: JSON.stringify({ assetIds: ids }),
    })
    await authed("/api/v1/photos/assets/actions/delete", {
      method: "POST",
      body: JSON.stringify({ assetIds: ids }),
    })
    total += ids.length
    console.log(`  purged ${total}…`)
  }
  console.log(`Done. Removed ${total} assets.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
