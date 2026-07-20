import type { ComponentType, ReactNode } from "react"
import { formatMediumDateTime } from "@workspace/i18n/format"
import { Suspense, lazy, useState } from "react"
import { decryptName, decryptWithMetaKey } from "@workspace/core/e2e"
import { bytesParts } from "@workspace/core/format"
import {
  ArrowSquareOut,
  Calendar,
  Camera,
  CircleNotch,
  Cube,
  File,
  HeartIcon,
  MapPin,
} from "@phosphor-icons/react"
import NumberFlow from "@number-flow/react"
import { type AssetExif, fetchAsset } from "@workspace/core/photos"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { type SplatSource, loadStoredSplat } from "@pages/Photos/splatViewing"

const PhotoLocationMap = lazy(
  () => import("@pages/Photos/components/PhotoLocationMap/PhotoLocationMap"),
)
const SplatResult = lazy(() => import("@pages/Drive/components/ModelViewer/SplatResult"))

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

const formatDuration = (ms?: number | null): string | undefined => {
  if (!ms || ms <= 0) return undefined
  const total = Math.round(ms / 1000)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (value: number) => String(value).padStart(2, "0")
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`
}

const Row = ({ label, value }: { label: string; value?: ReactNode }) =>
  value ? (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground/90 text-right break-words">{value}</span>
    </div>
  ) : null

const Section = ({
  icon: IconCmp,
  title,
  children,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  children: ReactNode
}) => (
  <div className="flex flex-col">
    <div className="text-muted-foreground flex items-center gap-2 pb-1 text-xs font-semibold tracking-wide uppercase">
      <IconCmp className="size-4" />
      {title}
    </div>
    <div className="border-border/60 flex flex-col border-t pt-1">{children}</div>
  </div>
)

interface InfoPanelProps {
  assetId: string
  isFavorite?: boolean
  onFavorite?: () => void
  onShare?: () => void
}

const InfoPanel = ({ assetId, isFavorite, onFavorite, onShare }: InfoPanelProps) => {
  const { t } = useTranslation("photos")
  const { data } = useQuery({
    queryKey: ["photos", "asset", assetId],
    queryFn: () => fetchAsset(assetId),
  })
  const asset = data?.asset
  const [splatSrc, setSplatSrc] = useState<SplatSource | null>(null)
  const [splatLoading, setSplatLoading] = useState(false)
  const viewSplat = async () => {
    if (!asset || splatLoading) return
    setSplatLoading(true)
    const name = (asset.encrypted && decryptName(asset.encryptedName)) || asset.originalFilename
    const source = await loadStoredSplat(assetId, asset.mimeType, name).catch(() => null)
    setSplatLoading(false)
    if (source) setSplatSrc(source)
  }

  if (!asset) {
    return (
      <div className="flex h-full w-full flex-col gap-5 p-5">
        <h2 className="text-base font-semibold">{t("infoPanel.details")}</h2>
        <p className="text-muted-foreground text-sm">{t("infoPanel.loading")}</p>
      </div>
    )
  }

  const exif = asset.exif ?? (asset.encrypted ? decryptJson<AssetExif>(asset.encryptedExif) : null)
  const decryptedLocation = asset.encrypted
    ? decryptJson<{ lat?: number; lng?: number }>(asset.encryptedLocation)
    : null
  const latitude =
    asset.latitude ?? (typeof decryptedLocation?.lat === "number" ? decryptedLocation.lat : null)
  const longitude =
    asset.longitude ?? (typeof decryptedLocation?.lng === "number" ? decryptedLocation.lng : null)
  const camera = [asset.cameraMake ?? exif?.make, asset.cameraModel ?? exif?.model]
    .filter(Boolean)
    .join(" ")
  const sizeParts = bytesParts(asset.sizeBytes)
  const dimensions =
    asset.width && asset.height ? (
      <span>
        <NumberFlow value={asset.width} /> × <NumberFlow value={asset.height} />
      </span>
    ) : undefined
  const megapixels =
    asset.width && asset.height ? (asset.width * asset.height) / 1_000_000 : undefined
  const isImage = asset.mimeType.startsWith("image/")
  const kindLabel = isImage
    ? t("infoPanel.kindImage")
    : asset.mimeType.startsWith("video/")
      ? t("infoPanel.kindVideo")
      : asset.mimeType.startsWith("audio/")
        ? t("infoPanel.kindAudio")
        : t("infoPanel.kindFile")
  const duration = formatDuration(asset.durationMs)
  const taken = asset.takenAt ? formatMediumDateTime(asset.takenAt) : undefined
  const added = formatMediumDateTime(asset.createdAt)
  const focal = exif?.focalLength
    ? `${exif.focalLength} mm${exif.focalLengthIn35mm ? ` (${exif.focalLengthIn35mm} mm eq.)` : ""}`
    : undefined
  const exposureComp =
    exif?.exposureCompensation !== undefined
      ? `${exif.exposureCompensation > 0 ? "+" : ""}${exif.exposureCompensation} EV`
      : undefined

  const hasCamera = Boolean(
    camera || exif?.iso || exif?.fNumber || exif?.exposureTime || exif?.focalLength || exif?.lens,
  )
  const hasLocation = latitude != null && longitude != null
  const displayName = (asset.encrypted && decryptName(asset.encryptedName)) || asset.originalFilename

  return (
    <div className="flex h-full w-full flex-col">
      <div className="border-border/60 flex items-start justify-between gap-3 border-b p-5">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] leading-tight font-semibold">{displayName}</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            {kindLabel} · {sizeParts.value} {sizeParts.unit}
          </p>
        </div>
        {onFavorite || onShare ? (
          <div className="flex shrink-0 items-center gap-0.5">
            {onFavorite ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("infoPanel.favourite")}
                onClick={onFavorite}
                className="rounded-full"
              >
                <HeartIcon weight={isFavorite ? "fill" : "regular"} className="size-[18px]" />
              </Button>
            ) : null}
            {onShare ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("infoPanel.share")}
                onClick={onShare}
                className="rounded-full"
              >
                <ArrowSquareOut className="size-[18px]" />
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="scrollbar-slim flex flex-1 flex-col gap-5 overflow-y-auto p-5">
        <Section icon={File} title={t("infoPanel.file")}>
          <Row label={t("infoPanel.name")} value={displayName} />
          <Row label={t("infoPanel.kind")} value={kindLabel} />
          <Row label={t("infoPanel.type")} value={asset.mimeType} />
          <Row
            label={t("infoPanel.size")}
            value={
              <NumberFlow
                value={sizeParts.value}
                suffix={` ${sizeParts.unit}`}
                format={{ maximumFractionDigits: sizeParts.decimals }}
              />
            }
          />
          <Row label={t("infoPanel.dimensions")} value={dimensions} />
          {isImage && megapixels !== undefined ? (
            <Row
              label={t("infoPanel.resolution")}
              value={
                <NumberFlow
                  value={megapixels}
                  suffix=" MP"
                  format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
                />
              }
            />
          ) : null}
          <Row label={t("infoPanel.duration")} value={duration} />
        </Section>

        <Section icon={Calendar} title={t("infoPanel.date")}>
          <Row label={t("infoPanel.taken")} value={taken} />
          <Row label={t("infoPanel.added")} value={added} />
        </Section>

        {asset.splat ? (
          <Section icon={Cube} title={t("infoPanel.threeD", { defaultValue: "3D" })}>
            <div className="pt-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void viewSplat()}
                disabled={splatLoading}
                className="w-full gap-1.5"
              >
                {splatLoading ? (
                  <CircleNotch className="size-4 animate-spin" />
                ) : (
                  <Cube className="size-4" />
                )}
                {t("lightbox.viewSplat", { defaultValue: "View 3D splat" })}
              </Button>
            </div>
          </Section>
        ) : null}

        {hasCamera ? (
          <Section icon={Camera} title={t("infoPanel.camera")}>
            <Row label={t("infoPanel.camera")} value={camera || undefined} />
            <Row label={t("infoPanel.lens")} value={exif?.lens} />
            <Row label={t("infoPanel.iso")} value={exif?.iso ? `ISO ${exif.iso}` : undefined} />
            <Row label={t("infoPanel.aperture")} value={exif?.fNumber ? `ƒ/${exif.fNumber}` : undefined} />
            <Row label={t("infoPanel.shutter")} value={formatShutter(exif?.exposureTime)} />
            <Row label={t("infoPanel.focalLength")} value={focal} />
            <Row label={t("infoPanel.exposure")} value={exposureComp} />
            <Row label={t("infoPanel.metering")} value={asText(exif?.meteringMode)} />
            <Row label={t("infoPanel.whiteBalance")} value={asText(exif?.whiteBalance)} />
            <Row label={t("infoPanel.flash")} value={asText(exif?.flash)} />
            <Row label={t("infoPanel.program")} value={asText(exif?.exposureProgram)} />
            <Row label={t("infoPanel.software")} value={exif?.software} />
          </Section>
        ) : null}

        {hasLocation ? (
          <Section icon={MapPin} title={t("infoPanel.location")}>
            <div className="flex flex-col gap-1 pt-1">
              <Suspense fallback={null}>
                <PhotoLocationMap lat={latitude} lng={longitude} />
              </Suspense>
              <Row
                label={t("infoPanel.coordinates")}
                value={`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}
              />
              <a
                href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary py-1.5 text-sm underline-offset-2 hover:underline"
              >
                {t("infoPanel.viewOnMap")}
              </a>
            </div>
          </Section>
        ) : null}
      </div>

      {splatSrc ? (
        <Suspense fallback={null}>
          <SplatResult splat={splatSrc} onClose={() => setSplatSrc(null)} />
        </Suspense>
      ) : null}
    </div>
  )
}

export default InfoPanel
