import type { Metadata } from "next"
import PageShell from "@components/PageShell"
import PageHero from "@components/PageHero"
import Markdown from "@components/Markdown"
import { TERMS, LEGAL_UPDATED } from "@lib/legal"
import { formatDate } from "@lib/format"

export const metadata: Metadata = {
  title: "Terms of Service · PolarHQ",
  description: "The terms that govern use of PolarHQ and its website.",
}

const TermsPage = () => (
  <PageShell
    hero={
      <PageHero
        eyebrow="Legal"
        title="Terms of Service"
        subtitle={`Last updated ${formatDate(LEGAL_UPDATED)}`}
      />
    }
  >
    <Markdown>{TERMS}</Markdown>
  </PageShell>
)

export default TermsPage
