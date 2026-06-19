"use client"

import type { ReactNode } from "react"
import { useRef } from "react"
import { ThemeProvider } from "@components/theme-provider"
import { UploadProvider } from "@lib/uploadManager"
import I18nProvider from "@workspace/i18n/provider"
import { makeQueryClient } from "@workspace/core/queryClient"
import { type AppStore, makeStore } from "@store/store"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@workspace/ui/components/sonner"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { Provider as ReduxProvider } from "react-redux"
import UploadPanel from "@components/UploadPanel/UploadPanel"

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
