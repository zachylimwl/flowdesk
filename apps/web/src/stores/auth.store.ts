import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export interface AuthUser {
  id: string
  email: string
  role: string
}

interface AuthState {
  // Persisted (localStorage via zustand/persist)
  refreshToken: string | null

  // In-memory only
  user: AuthUser | null
  accessToken: string | null
  isAuthenticated: boolean
  isInitialized: boolean
}

interface AuthActions {
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void
  setAccessToken: (token: string) => void
  clearAuth: () => void
  initialize: () => Promise<void>
}

type AuthStore = AuthState & AuthActions

const initialState: AuthState = {
  refreshToken: null,
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitialized: false,
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setAuth: (user, accessToken, refreshToken) => {
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isInitialized: true,
        })
      },

      setAccessToken: (token) => {
        set({ accessToken: token })
      },

      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isInitialized: true,
        })
      },

      initialize: async () => {
        const { refreshToken, isInitialized } = get()

        // Already initialized in this session — skip
        if (isInitialized) return

        if (!refreshToken) {
          set({ isInitialized: true })
          return
        }

        try {
          // Use plain axios to avoid circular dependency with the api-client interceptor
          const response = await axios.post(
            `${BASE_URL}/api/v1/auth/refresh`,
            { refreshToken }
          )
          const { accessToken, refreshToken: newRefreshToken, user } =
            response.data

          set({
            user,
            accessToken,
            refreshToken: newRefreshToken,
            isAuthenticated: true,
            isInitialized: true,
          })
        } catch {
          // Refresh token is expired or invalid — clear everything
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isInitialized: true,
          })
        }
      },
    }),
    {
      name: 'flowdesk-auth',
      storage: createJSONStorage(() => localStorage),
      // Only persist the refresh token — never persist the access token
      partialize: (state) => ({ refreshToken: state.refreshToken }),
    }
  )
)