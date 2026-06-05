import { QueryClient } from "@tanstack/react-query"

/** Create a React Query client. One per browser session via the provider. */
export const makeQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  })
