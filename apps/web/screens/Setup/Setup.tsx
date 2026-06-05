"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { APP_NAME } from "@lib/env"
import { fetchSetupStatus } from "@lib/setup"
import AdminAccountStep from "@pages/Setup/components/AdminAccountStep/AdminAccountStep"
import CreateGroupsStep from "@pages/Setup/components/CreateGroupsStep/CreateGroupsStep"
import { useQuery } from "@tanstack/react-query"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

type Step = "admin" | "groups"

const Setup = () => {
  const router = useRouter()
  const [step, setStep] = useState<Step>("admin")
  const { data, isLoading } = useQuery({ queryKey: ["setup-status"], queryFn: fetchSetupStatus })

  useEffect(() => {
    if (data?.setupCompleted && step === "admin") router.replace("/")
  }, [data, step, router])

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to {APP_NAME}</CardTitle>
          <CardDescription>
            {step === "admin"
              ? "Create the first administrator account to get started."
              : "Set up groups for your users (optional)."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : step === "admin" ? (
            <AdminAccountStep onComplete={() => setStep("groups")} />
          ) : (
            <CreateGroupsStep onFinish={() => router.replace("/")} />
          )}
        </CardContent>
      </Card>
    </main>
  )
}

export default Setup
