"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckCircle } from "@phosphor-icons/react/CheckCircle"
import { Info } from "@phosphor-icons/react/Info"
import { WarningCircle } from "@phosphor-icons/react/WarningCircle"
import { WarningOctagon } from "@phosphor-icons/react/WarningOctagon"
import { Spinner } from "@phosphor-icons/react/Spinner"
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CheckCircle className="size-4" />
        ),
        info: (
          <Info className="size-4" />
        ),
        warning: (
          <WarningCircle className="size-4" />
        ),
        error: (
          <WarningOctagon className="size-4" />
        ),
        loading: (
          <Spinner className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--card-foreground)",
          "--normal-border": "color-mix(in oklab, var(--foreground) 12%, transparent)",
          "--border-radius": "var(--radius-xl)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast !rounded-2xl shadow-xl",
          title: "font-medium",
          description: "text-muted-foreground",
          icon: "text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
