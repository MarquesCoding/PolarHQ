import Editor from "@pages/Docs/Editor"

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  return <Editor key={id} nodeId={id} />
}

export default Page
