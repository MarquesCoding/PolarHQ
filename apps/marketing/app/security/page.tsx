import type { Metadata } from "next"
import { CloudSlash, Eye, HardDrives, Key, LockKey, ShieldCheck } from "@phosphor-icons/react/ssr"
import PageShell from "@components/PageShell"
import PageHero from "@components/PageHero"
import Reveal from "@components/Reveal"
import SecurityFaq from "@components/SecurityFaq"

export const metadata: Metadata = {
  title: "Security · PolarHQ",
  description:
    "How PolarHQ keeps your photos, files and documents end-to-end encrypted, zero-knowledge, and on a server you control.",
}

const PILLARS = [
  {
    icon: ShieldCheck,
    title: "End-to-end encrypted",
    body: "Every photo, file and document, along with its thumbnails, filenames and metadata, is encrypted on your device with libsodium before it leaves. The server only ever stores ciphertext.",
  },
  {
    icon: Eye,
    title: "Zero-knowledge",
    body: "Your master key is derived from your password and never touches the server. Content keys are wrapped to it, so no one but you can decrypt your library: not a host, not us, not an attacker with the database.",
  },
  {
    icon: HardDrives,
    title: "Self-hosted, your keys",
    body: "PolarHQ runs on hardware you own, with no third-party cloud, no telemetry and no lock-in. Your keys, your server, your data, exportable at any time.",
  },
]

const STEPS = [
  {
    icon: Key,
    title: "Your key never leaves your device",
    body: "Your password derives a master key in your browser via a memory-hard KDF. The server stores only a verifier, never your key or password.",
  },
  {
    icon: LockKey,
    title: "Every item gets its own key",
    body: "Each photo, file and doc is encrypted with a unique random content key, which is then sealed to your master key and stored wrapped. Sharing hands over only that one item's key.",
  },
  {
    icon: CloudSlash,
    title: "The server only serves ciphertext",
    body: "Media is delivered through authenticated, ownership-checked routes (never public presigned links) and decrypted only in your app. Thumbnails, EXIF, locations and derivatives are encrypted too.",
  },
]

const SecurityPage = () => (
  <PageShell
    className="max-w-5xl"
    hero={
      <PageHero
        eyebrow="Security"
        title="Encrypted by default. Yours by design."
        subtitle="Every photo, file and document is end-to-end encrypted on your device, and runs on a server you control."
      />
    }
  >
    <div className="grid gap-5 sm:grid-cols-3">
      {PILLARS.map((pillar, index) => (
        <Reveal key={pillar.title} delay={index * 0.06}>
          <div className="border-foreground/10 bg-foreground/[0.02] flex h-full flex-col rounded-2xl border p-6">
            <span className="border-primary/20 bg-primary/10 text-primary mb-4 inline-flex size-11 items-center justify-center rounded-xl border">
              <pillar.icon className="size-5" weight="fill" />
            </span>
            <h3 className="text-foreground text-lg font-semibold">{pillar.title}</h3>
            <p className="text-foreground/65 mt-2 text-[15px] leading-relaxed text-pretty">
              {pillar.body}
            </p>
          </div>
        </Reveal>
      ))}
    </div>

    <div className="mt-24">
      <Reveal>
        <h2 className="font-display text-foreground text-center text-3xl font-bold tracking-tight sm:text-4xl">
          How the encryption works
        </h2>
      </Reveal>
      <div className="mx-auto mt-10 flex max-w-2xl flex-col gap-4">
        {STEPS.map((step, index) => (
          <Reveal key={step.title} delay={index * 0.05}>
            <div className="border-foreground/10 bg-foreground/[0.02] flex items-start gap-4 rounded-2xl border p-5">
              <span className="border-foreground/10 bg-foreground/[0.03] flex size-10 shrink-0 items-center justify-center rounded-xl border">
                <step.icon className="text-foreground/80 size-5" />
              </span>
              <div>
                <h3 className="text-foreground font-semibold">{step.title}</h3>
                <p className="text-foreground/65 mt-1 text-[15px] leading-relaxed text-pretty">
                  {step.body}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal delay={0.1}>
        <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-center text-sm">
          The tradeoff of real end-to-end encryption: without your password or recovery code, no one
          (including us) can recover encrypted data. Keep your recovery code safe.
        </p>
      </Reveal>
    </div>

    <div className="mt-24">
      <Reveal>
        <h2 className="font-display text-foreground text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Frequently asked questions
        </h2>
      </Reveal>
      <Reveal delay={0.06} className="mx-auto mt-8 max-w-2xl">
        <SecurityFaq />
      </Reveal>
    </div>
  </PageShell>
)

export default SecurityPage
