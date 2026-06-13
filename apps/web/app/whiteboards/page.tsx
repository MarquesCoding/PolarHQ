import { redirect } from "next/navigation"

/** Whiteboards live in the unified Vault explorer; the standalone list is retired. */
const Page = () => {
  redirect("/drive/files")
}

export default Page
