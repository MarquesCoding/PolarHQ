import type { Metadata } from "next"
import PageShell from "@components/PageShell"
import PageHero from "@components/PageHero"
import Reveal from "@components/Reveal"
import { ROADMAP, type RoadmapStatus } from "@lib/roadmap"

export const metadata: Metadata = {
  title: "Roadmap · PolarHQ",
  description: "What's shipped, what's being built, and what's coming next.",
}

const DOT: Record<RoadmapStatus, string> = {
  shipped: "bg-emerald-400",
  "in-progress": "bg-primary",
  planned: "bg-amber-400",
  exploring: "bg-foreground/40",
}

const RoadmapPage = () => (
  <PageShell
    className="max-w-5xl"
    hero={
      <PageHero
        eyebrow="Roadmap"
        title="Where PolarHQ is headed"
        subtitle="Shipped, in progress, and on the horizon."
      />
    }
  >

    <div className="space-y-16">
      {ROADMAP.map((column) => (
        <Reveal key={column.status}>
          <section>
            <div className="mb-1 flex items-center gap-2.5">
              <span className={`size-2.5 rounded-full ${DOT[column.status]}`} />
              <h2 className="text-foreground text-xl font-semibold tracking-tight">
                {column.label}
              </h2>
              <span className="text-muted-foreground/70 text-sm">{column.items.length}</span>
            </div>
            <p className="text-muted-foreground mb-6 text-sm">{column.blurb}</p>

            <div className="grid gap-4 sm:grid-cols-2">
              {column.items.map((item) => (
                <div
                  key={item.title}
                  className="border-border/50 bg-foreground/[0.02] rounded-xl border p-5"
                >
                  <h3 className="text-foreground text-[15px] font-medium">{item.title}</h3>
                  <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>
      ))}
    </div>
  </PageShell>
)

export default RoadmapPage
