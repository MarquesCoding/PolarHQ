"use client"

import { type ComponentType } from "react"
import { motion } from "motion/react"
import { Check, FolderSimple, Images, ShieldCheck } from "@phosphor-icons/react"
import { cn } from "@workspace/ui/lib/utils"

interface Feature {
  icon: ComponentType<{ className?: string; weight?: "fill" | "regular" }>
  eyebrow: string
  title: string
  description: string
  points: string[]
  shot: string
  video?: string
  sticker: string
}

const FEATURES: Feature[] = [
  {
    icon: Images,
    eyebrow: "Photos",
    title: "Your memories, decrypted only for you",
    description:
      "A fast, Apple-Photos-grade gallery that finds faces, places and things — entirely on device. Thumbnails and originals are decrypted in your browser, never on the server.",
    points: ["On-device search & albums", "Live photos and video", "Stacks, favourites and a map"],
    shot: "/shots/photos.jpg",
    video: "/demos/photos.mp4",
    sticker: "/stickers/bear-browse.png",
  },
  {
    icon: FolderSimple,
    eyebrow: "Drive",
    title: "Every file in one encrypted home",
    description:
      "Upload, organise and share anything. Sync a local folder like Dropbox, browse it as a device, and open Office files in a click — with everything end-to-end encrypted at rest.",
    points: ["Folder sync across devices", "Share links you control", "Versions, trash and locked folders"],
    shot: "/shots/drive-files.jpg",
    video: "/demos/drive.mp4",
    sticker: "/stickers/bear-organise.png",
  },
  {
    icon: ShieldCheck,
    eyebrow: "Self-hosted",
    title: "Runs on hardware you own",
    description:
      "Deploy the whole suite with a single command. An admin console gives you users, roles, per-user limits and off-site backups — and no telemetry, ever.",
    points: ["One-command deploy", "Roles, groups & limits", "Automatic S3 / Drive backups"],
    shot: "/shots/drive-overview.jpg",
    sticker: "/stickers/bear-hide.png",
  },
]

const FeatureRow = ({ feature, flip }: { feature: Feature; flip: boolean }) => {
  const Icon = feature.icon
  return (
    <div className="grid items-center gap-10 sm:grid-cols-2 sm:gap-14">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
        className={flip ? "sm:order-2" : ""}
      >
        <div className="border-primary/20 bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase">
          <Icon className="size-3.5" weight="fill" />
          {feature.eyebrow}
        </div>
        <h3 className="font-display text-foreground mt-4 text-3xl font-bold tracking-tight sm:text-[2.5rem] sm:leading-[1.08]">
          {feature.title}
        </h3>
        <p className="text-foreground/65 mt-4 text-lg leading-relaxed text-pretty">
          {feature.description}
        </p>
        <ul className="mt-6 flex flex-col gap-2.5">
          {feature.points.map((point) => (
            <li key={point} className="text-foreground/75 flex items-center gap-2.5 text-[15px]">
              <span className="bg-primary/15 text-primary flex size-5 shrink-0 items-center justify-center rounded-full">
                <Check className="size-3" weight="bold" />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1], delay: 0.06 }}
        className={cn("relative", flip ? "sm:order-1" : "")}
      >
        <div className="border-foreground/10 overflow-hidden rounded-2xl border bg-black/5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.35)]">
          {feature.video ? (
            <video
              src={feature.video}
              poster={feature.shot}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="block w-full"
            />
          ) : (
            <img
              src={feature.shot}
              alt={`${feature.eyebrow} in PolarHQ`}
              width={1800}
              height={1200}
              loading="lazy"
              className="block w-full"
            />
          )}
        </div>
        <motion.img
          src={feature.sticker}
          alt=""
          aria-hidden
          initial={{ opacity: 0, y: 16, rotate: flip ? 8 : -8 }}
          whileInView={{ opacity: 1, y: 0, rotate: flip ? 6 : -6 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
          className={cn(
            "pointer-events-none absolute -top-10 z-10 w-24 drop-shadow-xl sm:w-28",
            flip ? "-right-4 sm:-right-8" : "-left-4 sm:-left-8",
          )}
        />
      </motion.div>
    </div>
  )
}

const Showcase = () => (
  <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
    <div className="relative mx-auto max-w-2xl text-center">
      <motion.img
        src="/stickers/bear-wave.png"
        alt=""
        aria-hidden
        initial={{ opacity: 0, y: 20, rotate: -10 }}
        whileInView={{ opacity: 1, y: 0, rotate: -6 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
        className="pointer-events-none absolute -top-24 left-1/2 hidden w-28 -translate-x-1/2 drop-shadow-xl sm:block"
      />
      <div className="border-primary/25 bg-primary/10 text-primary inline-flex items-center rounded-full border px-3.5 py-1.5 text-[13px] font-semibold">
        Everything in one place
      </div>
      <h2 className="font-display text-foreground mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
        One private suite. Every app you need.
      </h2>
      <p className="text-foreground/65 mx-auto mt-5 max-w-xl text-lg text-pretty">
        The everyday tools you rely on, rebuilt to run on your own server and answer to no one but
        you.
      </p>
    </div>

    <div className="mt-20 flex flex-col gap-24 sm:mt-24 sm:gap-32">
      {FEATURES.map((feature, index) => (
        <FeatureRow key={feature.eyebrow} feature={feature} flip={index % 2 === 1} />
      ))}
    </div>
  </section>
)

export default Showcase
