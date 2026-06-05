"use client"

import { authClient } from "@lib/authClient"
import { type RegistrationMode, completeSetup } from "@lib/setup"
import { useForm } from "@tanstack/react-form"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { toast } from "sonner"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
  registrationMode: z.enum(["invite_only", "open", "closed"]),
})

const REGISTRATION_OPTIONS: { value: RegistrationMode; label: string }[] = [
  { value: "invite_only", label: "Invite only — admins create accounts" },
  { value: "open", label: "Open — anyone can register" },
  { value: "closed", label: "Closed — no new accounts" },
]

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
        if (signIn.error) throw new Error(signIn.error.message ?? "Sign-in failed")
        toast.success("Admin account created")
        onComplete()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Setup failed")
      }
    },
  })

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
            <Label htmlFor={field.name}>Your name</Label>
            <Input
              id={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="Ada Lovelace"
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
            <Label htmlFor={field.name}>Email</Label>
            <Input
              id={field.name}
              type="email"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="admin@example.com"
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
              placeholder="At least 8 characters"
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
            <Label htmlFor={field.name}>Who can create accounts?</Label>
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
            {isSubmitting ? "Creating…" : "Create admin & continue"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}

export default AdminAccountStep
