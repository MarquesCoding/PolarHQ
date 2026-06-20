import { useEffect, useRef, useState } from "react"
import { useNavigation } from "@workspace/screens/platform"
import RecoveryCodeDialog from "@components/RecoveryCodeDialog"
import { authClient } from "@workspace/core/authClient"
import { e2eReady, isEnrolled, setupKeys, unlockKeys } from "@workspace/core/e2e"
import { coreConfig } from "@workspace/core/config"
import { useForm } from "@tanstack/react-form"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { z } from "zod"
import logo from "../../components/FlatShell/logo.png"

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

  useEffect(() => {
    if (!isPending && session?.user && !manualRedirect.current) router.replace("/")
  }, [isPending, session, router])

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      const result = await authClient.signIn.email({
        email: value.email,
        password: value.password,
      })
      if (result.error) {
        toast.error(result.error.message ?? t("signIn.signInFailed"))
        return
      }
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
    <main className="grid min-h-svh lg:grid-cols-2">
      <div className="bg-primary relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-24 size-96 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute right-0 bottom-0 size-[30rem] translate-x-1/3 translate-y-1/3 rounded-full bg-sky-200/30 blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/25" />
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <img src={logo} alt="" className="size-9" />
          <span className="text-lg font-semibold">{appName}</span>
        </div>
        <h1 className="relative z-10 max-w-md text-3xl leading-snug font-semibold text-balance">
          {t("signIn.tagline")}
        </h1>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src={logo} alt="" className="size-9" />
            <span className="text-lg font-semibold">{appName}</span>
          </div>

          <div className="mb-8 flex flex-col gap-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("signIn.title", { appName })}
            </h2>
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
                <Button type="submit" size="lg" className="mt-1" disabled={isSubmitting}>
                  {isSubmitting ? t("signIn.signingIn") : t("signIn.signIn")}
                </Button>
              )}
            </form.Subscribe>
          </form>
        </div>
      </div>
    </main>
  )
}

export default SignIn
