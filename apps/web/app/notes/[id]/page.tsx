import NoteEditor from "@pages/Notes/NoteEditor"

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  return <NoteEditor key={id} nodeId={id} />
}

export default Page
