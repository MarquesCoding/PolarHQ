import Browser from "@pages/Drive/Browser"

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  return <Browser folderId={id} />
}

export default Page
