import { redirect } from "next/navigation"

/** Spreadsheets live in the unified Vault explorer; the standalone list is retired. */
const Page = () => {
  redirect("/drive/files")
}

export default Page
