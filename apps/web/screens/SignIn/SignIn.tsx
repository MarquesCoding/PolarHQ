"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import RecoveryCodeDialog from "@components/RecoveryCodeDialog"
import { authClient } from "@lib/authClient"
import { e2eReady, isEnrolled, setupKeys, unlockKeys } from "@lib/e2e"
import { APP_NAME } from "@lib/env"
import { useForm } from "@tanstack/react-form"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { toast } from "sonner"
import { z } from "zod"

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
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
  const router = useRouter()
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
        toast.error(result.error.message ?? "Sign-in failed")
        return
      }
      // We control the redirect from here so encryption keys unlock first.
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
        // Encryption setup is best-effort; never block sign-in on it.
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
        <p className="text-muted-foreground text-sm">Loading…</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in to {APP_NAME}</CardTitle>
          <CardDescription>Welcome back. Enter your credentials to continue.</CardDescription>
        </CardHeader>
        <CardContent>
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
                  <Label htmlFor={field.name}>Email</Label>
                  <Input
                    id={field.name}
                    type="email"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="you@example.com"
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
                  <Label htmlFor={field.name}>Password</Label>
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
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Signing in…" : "Sign in"}
                </Button>
              )}
            </form.Subscribe>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}

export default SignIn
