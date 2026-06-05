import { apiFetch } from "@lib/apiClient"

export type AppCategory = "storage" | "productivity" | "communication" | "security"
export type AppPrivacy = "server-side" | "e2e"
export type AppStatus = "available" | "coming_soon"

export interface SuiteApp {
  id: string
  name: string
  description: string
  icon: string
  route: string
  category: AppCategory
  privacy: AppPrivacy
  status: AppStatus
  available: boolean
}

export const fetchApps = (): Promise<SuiteApp[]> =>
  apiFetch<{ apps: SuiteApp[] }>("/api/v1/apps").then((response) => response.apps)
