import type { Metadata } from "next"
import PageShell from "@components/PageShell"
import PageHero from "@components/PageHero"
import PostBanner from "@components/PostBanner"
import Markdown from "@components/Markdown"
import ChangelogTimeline from "@components/ChangelogTimeline"
import Reveal from "@components/Reveal"
import { RELEASES } from "@lib/changelog"
import { formatDate } from "@lib/format"

export const metadata: Metadata = {
  title: "Changelog — PolarHQ",
  description: "Every release of PolarHQ, newest first.",
}

const ChangelogPage = () => (
  <PageShell
    className="max-w-3xl"
    hero={
      <PageHero
        eyebrow={`Now on Alpha v${RELEASES[0]?.version}`}
        title="Changelog"
        subtitle="Everything we've shipped, newest first."
      />
    }
  >
    <ChangelogTimeline versions={RELEASES.map((r) => ({ version: r.version, date: r.date }))} />

    <div className="space-y-20">
      {RELEASES.map((release) => (
        <Reveal key={release.version}>
        <section id={`v${release.version}`} className="scroll-mt-28">
          <PostBanner eyebrow={`Alpha v${release.version}`} className="mb-8" />

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="bg-primary/15 text-primary rounded-md px-2 py-0.5 text-xs font-medium">
              v{release.version}
            </span>
            <span className="text-muted-foreground text-sm">{formatDate(release.date)}</span>
            {release.tags && release.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {release.tags.map((tag) => (
                  <span
                    key={tag}
                    className="border-border/60 text-muted-foreground rounded-md border px-2 py-0.5 text-[11px]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {release.title ? (
            <h2 className="text-foreground mb-6 text-2xl font-semibold tracking-tight">
              {release.title}
            </h2>
          ) : null}

          <Markdown>{release.content}</Markdown>
        </section>
        </Reveal>
      ))}
    </div>
  </PageShell>
)

export default ChangelogPage
