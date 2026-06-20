import { useEffect, useState } from "react"
import { useNavigation } from "@workspace/screens/platform"
import { authClient } from "@workspace/core/authClient"
import { Icon } from "@lib/icons"
import DevicesDialog from "@components/DevicesDialog/DevicesDialog"
import LanguageSelector from "@components/LanguageSelector/LanguageSelector"
import { PageSpinner } from "@components/Spinner/Spinner"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { useTheme } from "@components/theme-provider"
import { useTranslation } from "react-i18next"

const Section = ({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) => (
  <section className="panel flex flex-col gap-4 rounded-xl p-5">
    <div className="flex flex-col gap-0.5">
      <h2 className="text-sm font-semibold">{title}</h2>
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
    {children}
  </section>
)

const Account = () => {
  const { t } = useTranslation("account")
  const router = useNavigation()
  const { data: session, isPending } = authClient.useSession()
  const { theme, setTheme } = useTheme()
  const [devicesOpen, setDevicesOpen] = useState(false)

  useEffect(() => {
    if (!isPending && !session?.user) router.replace("/sign-in")
  }, [isPending, session, router])

  if (isPending || !session?.user) return <PageSpinner />

  const user = session.user
  const themes = [
    { value: "light", label: t("light") },
    { value: "dark", label: t("dark") },
    { value: "system", label: t("system") },
  ] as const

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" aria-label={t("back")} onClick={() => router.back()}>
          <Icon name="nav-back" className="size-5" />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
      </header>

      <Section title={t("profile")}>
        <div className="flex items-center gap-3">
          <Avatar className="size-12">
            <AvatarImage
              src={`https://api.dicebear.com/10.x/notionists-neutral/svg?seed=${encodeURIComponent(
                user.email ?? user.name ?? "user",
              )}`}
              alt={user.name ?? "Account"}
            />
            <AvatarFallback>{(user.name ?? "U").slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-muted-foreground text-sm">{user.email}</span>
          </div>
        </div>
      </Section>

      <Section title={t("preferences")}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-sm font-medium">{t("language")}</span>
            <span className="text-muted-foreground text-xs">{t("languageHint")}</span>
          </div>
          <LanguageSelector />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-sm font-medium">{t("appearance")}</span>
            <span className="text-muted-foreground text-xs">{t("appearanceHint")}</span>
          </div>
          <div className="bg-sidebar-accent/50 flex items-center gap-0.5 rounded-lg p-0.5">
            {themes.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition",
                  theme === option.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title={t("security")} hint={t("devicesHint")}>
        <Button variant="outline" size="sm" className="w-fit" onClick={() => setDevicesOpen(true)}>
          <Icon name="key" className="size-4" />
          {t("manageDevices")}
        </Button>
      </Section>

      <DevicesDialog open={devicesOpen} onOpenChange={setDevicesOpen} />
    </div>
  )
}

export default Account
