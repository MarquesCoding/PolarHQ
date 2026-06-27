import { apiFetch } from "./apiClient"

export type RegistrationMode = "invite_only" | "open" | "closed"

export interface SetupStatus {
  setupCompleted: boolean
  registrationMode: RegistrationMode
  /** Read-only/demo mode — non-admins can't mutate content. */
  demoMode: boolean
}

export const fetchSetupStatus = (): Promise<SetupStatus> =>
  apiFetch<SetupStatus>("/api/v1/setup/status")

export interface CompleteSetupInput {
  name: string
  email: string
  password: string
  registrationMode: RegistrationMode
}

export const completeSetup = (input: CompleteSetupInput): Promise<{ userId: string }> =>
  apiFetch<{ userId: string }>("/api/v1/setup", {
    method: "POST",
    body: JSON.stringify(input),
  })

export interface Group {
  id: string
  name: string
  description: string | null
  createdAt: string
}

export const createGroup = (input: { name: string; description?: string }): Promise<{ group: Group }> =>
  apiFetch<{ group: Group }>("/api/v1/admin/groups", {
    method: "POST",
    body: JSON.stringify(input),
  })
