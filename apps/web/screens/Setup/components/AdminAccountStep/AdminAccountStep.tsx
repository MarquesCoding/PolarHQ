"use client"

import { useState } from "react"
import RecoveryCodeDialog from "@components/RecoveryCodeDialog"
import { authClient } from "@lib/authClient"
import { e2eReady, isEnrolled, setupKeys, unlockKeys } from "@lib/e2e"
import { apiErrorMessage } from "@lib/i18n/apiError"
import { type RegistrationMode, completeSetup } from "@polarhq/sdk/setup"
import { useForm } from "@tanstack/react-form"
import { Button } from "@polarhq/ui/components/button"
import { Input } from "@polarhq/ui/components/input"
import { Label } from "@polarhq/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@polarhq/ui/components/select"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { z } from "zod"

interface AdminAccountStepProps {
  onComplete: () => void
}

const fieldError = (errors: unknown[]): string | null => {
  const first = errors[0]
  if (!first) return null
  if (typeof first === "string") return first
  if (typeof first === "object" && first && "message" in first) {
    return String((first as { message: unknown }).message)
  }
  return null
}

const AdminAccountStep = ({ onComplete }: AdminAccountStepProps) => {
  const { t } = useTranslation("setup")
  const schema = z.object({
    name: z.string().min(1, t("adminAccountStep.nameRequired")),
    email: z.string().email(t("adminAccountStep.invalidEmail")),
    password: z.string().min(8, t("adminAccountStep.passwordMin")),
    registrationMode: z.enum(["invite_only", "open", "closed"]),
  })
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null)

  const REGISTRATION_OPTIONS: { value: RegistrationMode; label: string }[] = [
    { value: "invite_only", label: t("adminAccountStep.inviteOnlyLabel") },
    { value: "open", label: t("adminAccountStep.openLabel") },
    { value: "closed", label: t("adminAccountStep.closedLabel") },
  ]

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      registrationMode: "invite_only" as RegistrationMode,
    },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      try {
        await completeSetup(value)
        const signIn = await authClient.signIn.email({
          email: value.email,
          password: value.password,
        })
        if (signIn.error) throw new Error(signIn.error.message ?? t("adminAccountStep.signInFailed"))
        toast.success(t("adminAccountStep.accountCreated"))

        try {
          await e2eReady()
          if (await isEnrolled()) {
            await unlockKeys(value.password)
            onComplete()
          } else {
            const setup = await setupKeys(value.password)
            setRecoveryCode(setup.recoveryCode)
          }
        } catch {
          onComplete()
        }
      } catch (error) {
        toast.error(apiErrorMessage(error))
      }
    },
  })

  if (recoveryCode) {
    return <RecoveryCodeDialog recoveryCode={recoveryCode} onContinue={onComplete} />
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <form.Field name="name">
        {(field) => (
          <div className="flex flex-col gap-2">
            <Label htmlFor={field.name}>{t("adminAccountStep.nameLabel")}</Label>
            <Input
              id={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder={t("adminAccountStep.namePlaceholder")}
            />
            {fieldError(field.state.meta.errors) ? (
              <p className="text-destructive text-sm">{fieldError(field.state.meta.errors)}</p>
            ) : null}
          </div>
        )}
      </form.Field>

      <form.Field name="email">
        {(field) => (
          <div className="flex flex-col gap-2">
            <Label htmlFor={field.name}>{t("adminAccountStep.emailLabel")}</Label>
            <Input
              id={field.name}
              type="email"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder={t("adminAccountStep.emailPlaceholder")}
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
            <Label htmlFor={field.name}>{t("adminAccountStep.passwordLabel")}</Label>
            <Input
              id={field.name}
              type="password"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder={t("adminAccountStep.passwordPlaceholder")}
            />
            {fieldError(field.state.meta.errors) ? (
              <p className="text-destructive text-sm">{fieldError(field.state.meta.errors)}</p>
            ) : null}
          </div>
        )}
      </form.Field>

      <form.Field name="registrationMode">
        {(field) => (
          <div className="flex flex-col gap-2">
            <Label htmlFor={field.name}>{t("adminAccountStep.registrationModeLabel")}</Label>
            <Select
              value={field.state.value}
              onValueChange={(value) => field.handleChange(value as RegistrationMode)}
            >
              <SelectTrigger id={field.name}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGISTRATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <Button type="submit" disabled={isSubmitting} className="mt-1">
            {isSubmitting ? t("adminAccountStep.creating") : t("adminAccountStep.submit")}
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}

export default AdminAccountStep
