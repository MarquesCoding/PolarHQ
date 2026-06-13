import { redirect } from "next/navigation"

/** The suite opens straight into the Vault explorer — no app-grid launcher. */
const Page = () => {
  redirect("/drive")
}

export default Page
