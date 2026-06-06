"use client"

import dynamic from "next/dynamic"
import { decryptName, decryptWithMetaKey } from "@lib/e2e"
import { formatBytes } from "@lib/format"
import { Icon } from "@lib/icons"
import { type AssetExif, fetchAsset } from "@lib/photos"
import { useQuery } from "@tanstack/react-query"

const PhotoLocationMap = dynamic(
  () => import("@pages/Photos/components/PhotoLocationMap/PhotoLocationMap"),
  { ssr: false },
)

const decoder = new TextDecoder()

const decryptJson = <T,>(value: string | null | undefined): T | null => {
  if (!value) return null
  const bytes = decryptWithMetaKey(value)
  if (!bytes) return null
  try {
    return JSON.parse(decoder.decode(bytes)) as T
  } catch {
    return null
  }
}

const formatShutter = (seconds?: number): string | undefined => {
  if (seconds === undefined) return undefined
  if (seconds >= 1) return `${seconds}s`
  return `1/${Math.round(1 / seconds)}s`
}

const asText = (value?: string | number): string | undefined => {
  if (value === undefined) return undefined
  return typeof value === "number" ? String(value) : value
}

const Row = ({ label, value }: { label: string; value?: string | null }) =>
  value ? (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground/90 text-right break-words">{value}</span>
    </div>
  ) : null

const Section = ({
  icon,
  title,
  children,
}: {
  icon: string
  title: string
  children: React.ReactNode
}) => (
  <div className="flex flex-col">
    <div className="text-muted-foreground flex items-center gap-2 pb-1 text-xs font-semibold tracking-wide uppercase">
      <Icon name={icon} className="size-4" />
      {title}
    </div>
    <div className="border-border/60 flex flex-col border-t pt-1">{children}</div>
  </div>
)

interface InfoPanelProps {
  assetId: string
}

const InfoPanel = ({ assetId }: InfoPanelProps) => {
  const { data } = useQuery({
    queryKey: ["photos", "asset", assetId],
    queryFn: () => fetchAsset(assetId),
  })
  const asset = data?.asset

  if (!asset) {
    return (
      <div className="flex h-full w-full flex-col gap-5 p-5">
        <h2 className="text-base font-semibold">Details</h2>
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    )
  }

  const exif = asset.exif ?? (asset.encrypted ? decryptJson<AssetExif>(asset.encryptedExif) : null)
  const decryptedLocation = asset.encrypted
    ? decryptJson<{ lat?: number; lng?: number }>(asset.encryptedLocation)
    : null
  const latitude = asset.latitude ?? (typeof decryptedLocation?.lat === "number" ? decryptedLocation.lat : null)
  const longitude =
    asset.longitude ?? (typeof decryptedLocation?.lng === "number" ? decryptedLocation.lng : null)
  const camera = [asset.cameraMake ?? exif?.make, asset.cameraModel ?? exif?.model]
    .filter(Boolean)
    .join(" ")
  const dimensions = asset.width && asset.height ? `${asset.width} × ${asset.height}` : undefined
  const megapixels =
    asset.width && asset.height
      ? `${((asset.width * asset.height) / 1_000_000).toFixed(1)} MP`
      : undefined
  const taken = asset.takenAt
    ? new Date(asset.takenAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : undefined
  const added = new Date(asset.createdAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
  const focal = exif?.focalLength
    ? `${exif.focalLength} mm${exif.focalLengthIn35mm ? ` (${exif.focalLengthIn35mm} mm eq.)` : ""}`
    : undefined
  const exposureComp =
    exif?.exposureCompensation !== undefined
      ? `${exif.exposureCompensation > 0 ? "+" : ""}${exif.exposureCompensation} EV`
      : undefined

  const hasCamera = Boolean(
    camera ||
      exif?.iso ||
      exif?.fNumber ||
      exif?.exposureTime ||
      exif?.focalLength ||
      exif?.lens,
  )
  const hasLocation = latitude != null && longitude != null

  return (
    <div className="scrollbar-slim flex h-full w-full flex-col gap-5 overflow-y-auto p-5">
      <h2 className="text-base font-semibold">Details</h2>

      <Section icon="file-text" title="File">
        <Row
          label="Name"
          value={(asset.encrypted && decryptName(asset.encryptedName)) || asset.originalFilename}
        />
        <Row label="Type" value={asset.mimeType} />
        <Row label="Size" value={formatBytes(asset.sizeBytes)} />
        <Row label="Dimensions" value={dimensions} />
        <Row label="Resolution" value={megapixels} />
      </Section>

      <Section icon="calendar" title="Date">
        <Row label="Taken" value={taken} />
        <Row label="Added" value={added} />
      </Section>

      {hasCamera ? (
        <Section icon="camera" title="Camera">
          <Row label="Camera" value={camera || undefined} />
          <Row label="Lens" value={exif?.lens} />
          <Row label="ISO" value={exif?.iso ? `ISO ${exif.iso}` : undefined} />
          <Row label="Aperture" value={exif?.fNumber ? `ƒ/${exif.fNumber}` : undefined} />
          <Row label="Shutter" value={formatShutter(exif?.exposureTime)} />
          <Row label="Focal length" value={focal} />
          <Row label="Exposure" value={exposureComp} />
          <Row label="Metering" value={asText(exif?.meteringMode)} />
          <Row label="White balance" value={asText(exif?.whiteBalance)} />
          <Row label="Flash" value={asText(exif?.flash)} />
          <Row label="Program" value={asText(exif?.exposureProgram)} />
          <Row label="Software" value={exif?.software} />
        </Section>
      ) : null}

      {hasLocation ? (
        <Section icon="map-pin" title="Location">
          <div className="pt-1.5">
            <PhotoLocationMap lat={latitude} lng={longitude} />
          </div>
          <Row label="Coordinates" value={`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`} />
          <a
            href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`}
            target="_blank"
            rel="noreferrer"
            className="text-primary py-1.5 text-sm underline-offset-2 hover:underline"
          >
            View on map
          </a>
        </Section>
      ) : null}
    </div>
  )
}

export default InfoPanel
