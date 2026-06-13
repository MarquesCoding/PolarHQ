"use client"

import type { ReactNode } from "react"
import { useRef } from "react"
import { ThemeProvider } from "@polarhq/interface/components/theme-provider"
import { UploadProvider } from "@polarhq/interface/lib/uploadManager"
import I18nProvider from "@polarhq/i18n/I18nProvider"
import { makeQueryClient } from "@polarhq/interface/lib/queryClient"
import { type AppStore, makeStore } from "@polarhq/interface/store/store"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@polarhq/ui/components/sonner"
import { TooltipProvider } from "@polarhq/ui/components/tooltip"
import { Provider as ReduxProvider } from "react-redux"
import UploadPanel from "@polarhq/interface/components/UploadPanel/UploadPanel"

const Providers = ({ children }: { children: ReactNode }) => {
  const storeRef = useRef<AppStore | null>(null)
  if (!storeRef.current) storeRef.current = makeStore()

  const queryClientRef = useRef<QueryClient | null>(null)
  if (!queryClientRef.current) queryClientRef.current = makeQueryClient()

  return (
    <ReduxProvider store={storeRef.current}>
      <QueryClientProvider client={queryClientRef.current}>
        <I18nProvider>
          <ThemeProvider>
            <TooltipProvider>
              <UploadProvider>
                {children}
                <UploadPanel />
              </UploadProvider>
            </TooltipProvider>
            <Toaster position="bottom-right" />
          </ThemeProvider>
        </I18nProvider>
      </QueryClientProvider>
    </ReduxProvider>
  )
}

export default Providers
