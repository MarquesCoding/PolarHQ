import TagView from "@pages/Photos/TagView"

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  return <TagView tagId={id} />
}

export default Page
