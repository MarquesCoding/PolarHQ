import { useEffect, useRef, useState } from "react"
import { useNavigation } from "@workspace/screens/platform"
import RecoveryCodeDialog from "@components/RecoveryCodeDialog"
import { authClient } from "@workspace/core/authClient"
import { e2eReady, isEnrolled, setupKeys, unlockKeys } from "@workspace/core/e2e"
import { configureCore, coreConfig } from "@workspace/core/config"
import { useForm } from "@tanstack/react-form"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { z } from "zod"
import AuthLayout from "@components/AuthLayout/AuthLayout"
import logo from "../../components/FlatShell/logo.png"

/** Bridge the desktop shell installs so the (shared) sign-in screen can read the last-used server and
 *  persist the chosen one. Absent on the web shell, where the API is a fixed same-origin server. */
interface ServerBridge {
  last: string | null
  save: (url: string) => void
}

/** The future PolarHQ-managed cloud — not live yet, so "PolarHQ Hosted" is shown but parked. */
const POLAR_CLOUD_URL = "https://app.polarhq.app"
type HostMode = "cloud" | "self"

/** Default to https when no scheme is given and drop trailing slashes. */
const normalizeUrl = (raw: string): string => {
  const trimmed = raw.trim()
  if (!trimmed) return ""
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  return withScheme.replace(/\/+$/, "")
}

const makeSchema = (t: (key: string) => string) =>
  z.object({
    email: z.string().email(t("signIn.invalidEmail")),
    password: z.string().min(1, t("signIn.passwordRequired")),
  })

const fieldError = (errors: unknown[]): string | null => {
  const first = errors[0]
  if (!first) return null
  if (typeof first === "string") return first
  if (typeof first === "object" && first && "message" in first) {
    return String((first as { message: unknown }).message)
  }
  return null
}

const SignIn = () => {
  const { t } = useTranslation("auth")
  const schema = makeSchema(t)
  const router = useNavigation()
  const { data: session, isPending } = authClient.useSession()
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null)
  const manualRedirect = useRef(false)

  // Desktop only: choose the server right here (the web shell talks to its own same-origin API).
  const server =
    typeof window !== "undefined"
      ? (window as Window & { __polarServer?: ServerBridge }).__polarServer
      : undefined
  const [mode, setMode] = useState<HostMode>("self")
  const [serverUrl, setServerUrl] = useState(() => server?.last ?? "")

  // Keep the core data layer (and thus the auth client) pointed at the chosen self-hosted server, so
  // sign-in talks to it without a reload (authClient reads the configured URL per request).
  useEffect(() => {
    if (!server) return
    const url = mode === "cloud" ? POLAR_CLOUD_URL : normalizeUrl(serverUrl)
    if (url) configureCore({ apiUrl: url })
  }, [server, mode, serverUrl])

  useEffect(() => {
    if (!isPending && session?.user && !manualRedirect.current) router.replace("/")
  }, [isPending, session, router])

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      const url = mode === "cloud" ? POLAR_CLOUD_URL : normalizeUrl(serverUrl)
      if (server && !url) {
        toast.error(t("signIn.serverRequired"))
        return
      }
      if (server) configureCore({ apiUrl: url })

      let result: Awaited<ReturnType<typeof authClient.signIn.email>>
      try {
        result = await authClient.signIn.email({ email: value.email, password: value.password })
      } catch {
        toast.error(t("signIn.serverUnreachable"))
        return
      }
      if (result.error) {
        toast.error(result.error.message ?? t("signIn.signInFailed"))
        return
      }
      if (server) server.save(url)
      manualRedirect.current = true
      try {
        await e2eReady()
        if (await isEnrolled()) {
          await unlockKeys(value.password)
          router.replace("/")
        } else {
          const setup = await setupKeys(value.password)
          setRecoveryCode(setup.recoveryCode)
        }
      } catch {
        router.replace("/")
      }
    },
  })

  if (recoveryCode) {
    return (
      <main className="flex min-h-svh items-center justify-center p-6">
        <RecoveryCodeDialog recoveryCode={recoveryCode} onContinue={() => router.replace("/")} />
      </main>
    )
  }

  if (isPending || session?.user) {
    return (
      <main className="flex min-h-svh items-center justify-center p-6">
        <p className="text-muted-foreground text-sm">{t("signIn.loading")}</p>
      </main>
    )
  }

  const appName = coreConfig().appName

  return (
    <AuthLayout tagline={t("signIn.tagline")}>
      <div>
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <img src={logo} alt="" className="size-9" />
          <span className="text-lg font-semibold">{appName}</span>
        </div>

        <div className="mb-8 flex flex-col gap-1.5">
          <h2 className="text-2xl font-semibold tracking-tight">{t("signIn.title", { appName })}</h2>
          <p className="text-muted-foreground text-sm">{t("signIn.description")}</p>
        </div>

        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void form.handleSubmit()
          }}
        >
          {server ? (
            <div className="flex flex-col gap-3">
              <div className="bg-muted flex rounded-xl p-1">
                {(
                  [
                    { id: "cloud", label: t("signIn.polarHosted") },
                    { id: "self", label: t("signIn.selfHosted") },
                  ] as const
                ).map((option) => (
                  <Button
                    key={option.id}
                    type="button"
                    variant={mode === option.id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setMode(option.id)}
                    className={cn("flex-1 rounded-lg", mode !== option.id && "text-muted-foreground")}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              {mode === "self" ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="server">{t("signIn.serverAddress")}</Label>
                  <Input
                    id="server"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={serverUrl}
                    onChange={(event) => setServerUrl(event.target.value)}
                    placeholder={t("signIn.serverPlaceholder")}
                  />
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">{t("signIn.managedSoon")}</p>
              )}
            </div>
          ) : null}

          <form.Field name="email">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>{t("signIn.email")}</Label>
                <Input
                  id={field.name}
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder={t("signIn.emailPlaceholder")}
                />
                {fieldError(field.state.meta.errors) ? (
                  <p className="text-destructive text-sm">{fieldError(field.state.meta.errors)}</p>
                ) : null}
              </div>
            )}
          </form.Field>

          <form.Field name="password">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>{t("signIn.password")}</Label>
                <Input
                  id={field.name}
                  type="password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
                {fieldError(field.state.meta.errors) ? (
                  <p className="text-destructive text-sm">{fieldError(field.state.meta.errors)}</p>
                ) : null}
              </div>
            )}
          </form.Field>

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button
                type="submit"
                size="lg"
                className="mt-1"
                disabled={isSubmitting || (server && mode === "cloud")}
              >
                {isSubmitting ? t("signIn.signingIn") : t("signIn.signIn")}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </div>
    </AuthLayout>
  )
}

export default SignIn
