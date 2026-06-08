import FullEditor from "@pages/Sheets/FullEditor"

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  return <FullEditor key={id} nodeId={id} />
}

export default Page
