import type { Metadata } from "next"
import PageShell from "@components/PageShell"
import PageHero from "@components/PageHero"
import Markdown from "@components/Markdown"
import { PRIVACY, LEGAL_UPDATED } from "@lib/legal"
import { formatDate } from "@lib/format"

export const metadata: Metadata = {
  title: "Privacy Policy — PolarHQ",
  description: "How PolarHQ handles your data — short version: it can't read it.",
}

const PrivacyPage = () => (
  <PageShell
    hero={
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        subtitle={`Last updated ${formatDate(LEGAL_UPDATED)}`}
      />
    }
  >
    <Markdown>{PRIVACY}</Markdown>
  </PageShell>
)

export default PrivacyPage
