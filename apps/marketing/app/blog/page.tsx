import type { Metadata } from "next"
import Link from "next/link"
import PageShell from "@components/PageShell"
import PageHero from "@components/PageHero"
import PostBanner from "@components/PostBanner"
import Reveal from "@components/Reveal"
import { BLOG_POSTS } from "@lib/blog"
import { formatDate } from "@lib/format"

export const metadata: Metadata = {
  title: "Blog — PolarHQ",
  description: "Notes from building a private, self-hosted home for everything.",
}

const BlogIndex = () => (
  <PageShell
    className="max-w-5xl"
    hero={
      <PageHero
        eyebrow="Blog"
        title="Building in the open"
        subtitle="Notes from building a private home for everything."
      />
    }
  >
    <div className="grid gap-10 sm:grid-cols-2">
      {BLOG_POSTS.map((post, i) => (
        <Reveal key={post.slug} delay={(i % 2) * 0.08}>
          <Link href={`/blog/${post.slug}`} className="group flex flex-col gap-4">
            <PostBanner
              eyebrow={post.eyebrow}
              compact
              className="transition duration-300 group-hover:border-white/25"
            />
            <div>
            <div className="mb-3 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="border-border/60 text-muted-foreground rounded-md border px-2 py-0.5 text-[11px]"
                >
                  {tag}
                </span>
              ))}
            </div>
            <h2 className="text-foreground group-hover:text-foreground/80 text-xl font-semibold tracking-tight transition-colors">
              {post.title}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{post.excerpt}</p>
              <p className="text-muted-foreground/70 mt-3 text-xs">
                by <span className="text-foreground/80">{post.author}</span> ·{" "}
                {formatDate(post.date)}
              </p>
            </div>
          </Link>
        </Reveal>
      ))}
    </div>
  </PageShell>
)

export default BlogIndex
