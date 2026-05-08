import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5 minutes — data is considered fresh for 5 min
      retry: (failureCount, error) => {
        // Do not retry on 401 (auth errors) or 403 (permission errors)
        if (error instanceof Error && 'status' in error) {
          const status = (error as { status: number }).status
          if (status === 401 || status === 403 || status === 404) return false
        }
        return failureCount < 2
      },
    },
    mutations: {
      retry: false,
    },
  },
})