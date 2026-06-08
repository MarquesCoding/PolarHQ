import {
  IconBrandAndroid,
  IconBrandAppleFilled,
  IconBrandUbuntu,
  IconBrandWindowsFilled,
} from "@tabler/icons-react"

const PLATFORMS = [
  { label: "Windows 10+", icon: IconBrandWindowsFilled },
  { label: "macOS", icon: IconBrandAppleFilled },
  { label: "Linux", icon: IconBrandUbuntu },
  { label: "Android", icon: IconBrandAndroid },
]

const PlatformLinks = () => (
  <div className="flex flex-col items-center gap-2.5">
    <div className="text-foreground/55 flex items-center gap-4">
      {PLATFORMS.map((platform) => (
        <a
          key={platform.label}
          href="#"
          aria-label={platform.label}
          title={platform.label}
          className="hover:text-foreground transition-colors"
        >
          <platform.icon className="size-5" />
        </a>
      ))}
    </div>
    <p className="text-muted-foreground text-xs">
      Desktop for Windows 10+, macOS and Linux · Mobile on iOS and Android
    </p>
  </div>
)

export default PlatformLinks
