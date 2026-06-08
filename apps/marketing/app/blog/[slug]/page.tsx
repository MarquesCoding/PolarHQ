import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { IconArrowLeft } from "@tabler/icons-react"
import PageShell from "@components/PageShell"
import PostBanner from "@components/PostBanner"
import Markdown from "@components/Markdown"
import PostToc from "@components/PostToc"
import { BLOG_POSTS, getPost } from "@lib/blog"
import { formatDate } from "@lib/format"

export const generateStaticParams = () => BLOG_POSTS.map((post) => ({ slug: post.slug }))

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> => {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return { title: "Blog — PolarHQ" }
  return { title: `${post.title} — PolarHQ`, description: post.excerpt }
}

const BlogPostPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  return (
    <PageShell>
      <Link
        href="/blog"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <IconArrowLeft className="size-4" />
        Back to blog
      </Link>

      <PostBanner eyebrow={post.eyebrow} live className="mt-6" />

      <div className="mt-8 flex flex-wrap gap-2">
        {post.tags.map((tag) => (
          <span
            key={tag}
            className="border-border/60 text-muted-foreground rounded-md border px-2 py-0.5 text-[11px]"
          >
            {tag}
          </span>
        ))}
      </div>

      <h1 className="text-foreground mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
        {post.title}
      </h1>
      <p className="text-muted-foreground mt-4 text-sm">
        by <span className="text-foreground/85 font-medium">{post.author}</span> ·{" "}
        {formatDate(post.date)}
      </p>

      <article className="mt-10 [&_h2]:scroll-mt-24 [&_h3]:scroll-mt-24">
        <Markdown>{post.content}</Markdown>
      </article>

      <PostToc />
    </PageShell>
  )
}

export default BlogPostPage
