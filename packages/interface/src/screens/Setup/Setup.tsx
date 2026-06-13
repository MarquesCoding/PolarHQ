"use client"

import { useEffect, useState } from "react"
import { useRouter } from "@polarhq/interface/lib/router"
import { useTranslation } from "react-i18next"
import { sdkConfig } from "@polarhq/sdk/config"
import { fetchSetupStatus } from "@polarhq/sdk/setup"
import AdminAccountStep from "@polarhq/interface/screens/Setup/components/AdminAccountStep/AdminAccountStep"
import CreateGroupsStep from "@polarhq/interface/screens/Setup/components/CreateGroupsStep/CreateGroupsStep"
import { useQuery } from "@tanstack/react-query"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@polarhq/ui/components/card"

type Step = "admin" | "groups"

const Setup = () => {
  const { t } = useTranslation("setup")
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
          <CardTitle>{t("setup.welcome", { name: sdkConfig().appName })}</CardTitle>
          <CardDescription>
            {step === "admin"
              ? t("setup.adminDescription")
              : t("setup.groupsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">{t("setup.loading")}</p>
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
