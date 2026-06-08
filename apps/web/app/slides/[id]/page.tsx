import { redirect } from "next/navigation"

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  redirect(`/presentation/${id}`)
}

export default Page
