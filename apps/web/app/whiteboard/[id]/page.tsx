import WhiteboardEditor from "@pages/Whiteboard/WhiteboardEditor"

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  return <WhiteboardEditor key={id} nodeId={id} />
}

export default Page
