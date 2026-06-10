import { redirect } from "next/navigation"

/** The suite opens straight into Photos — no app-grid launcher. */
const Page = () => {
  redirect("/photos")
}

export default Page
