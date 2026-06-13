import { redirect } from "next/navigation"

/** Documents live in the unified Vault explorer; the standalone list is retired. */
const Page = () => {
  redirect("/drive/files")
}

export default Page
