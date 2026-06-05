import AlbumDetail from "@pages/Photos/AlbumDetail"

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  return <AlbumDetail albumId={id} />
}

export default Page
