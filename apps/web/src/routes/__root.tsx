import { Suspense } from 'react'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { useAuthStore } from '@/stores/auth.store'

export const Route = createRootRoute({
  beforeLoad: async () => {
    // Initialize auth state on every page load.
    // If a refresh token exists in localStorage, this exchanges it for
    // a new access token. Until this resolves, isInitialized is false
    // and child route guards will not redirect.
    await useAuthStore.getState().initialize()
  },
  component: RootComponent,
})

function RootComponent() {
  return (
    <Suspense>
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </Suspense>
  )
}
