import {
  AndroidLogo,
  AppleLogo,
  LinuxLogo,
  WindowsLogo,
} from "@phosphor-icons/react/ssr"

const PLATFORMS = [
  { label: "Windows 10+", icon: WindowsLogo },
  { label: "macOS", icon: AppleLogo },
  { label: "Linux", icon: LinuxLogo },
  { label: "Android", icon: AndroidLogo },
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
