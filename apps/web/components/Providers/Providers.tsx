"use client"

import type { ReactNode } from "react"
import { useRef } from "react"
import { ThemeProvider } from "@components/theme-provider"
import { UploadProvider } from "@lib/uploadManager"
import I18nProvider from "@workspace/i18n/provider"
import { makeQueryClient } from "@workspace/core/queryClient"
import { setMediaIndexer } from "@workspace/core/photosE2e"
import { type AppStore, makeStore } from "@store/store"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@workspace/ui/components/sonner"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { Provider as ReduxProvider } from "react-redux"
import UploadPanel from "@components/UploadPanel/UploadPanel"
import PlatformAdapter from "@components/PlatformAdapter/PlatformAdapter"

/** Wire the app's on-device search indexer into core's post-upload hook (kept out of core so the
 *  embedder/model stays app-side). The dynamic import keeps the model off the initial bundle. */
setMediaIndexer((assetId, source) => {
  void import("@lib/photoIndex")
    .then((index) => index.embedAndStore(assetId, source))
    .catch(() => undefined)
})

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
                <PlatformAdapter>
                  {children}
                  <UploadPanel />
                </PlatformAdapter>
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
