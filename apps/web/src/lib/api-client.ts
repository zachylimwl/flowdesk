import axios, { type AxiosError } from 'axios'
import { useAuthStore } from '@/stores/auth.store'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request interceptor: inject auth token ────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// ── Response interceptor: handle 401 with token refresh ──────────────────────
let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

const processQueue = (token: string) => {
  refreshQueue.forEach((resolve) => resolve(token))
  refreshQueue = []
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean
    }

    if (error.response?.status === 401 && !originalRequest?._retry) {
      const { refreshToken, setAccessToken, clearAuth } =
        useAuthStore.getState()

      if (!refreshToken) {
        clearAuth()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      if (isRefreshing) {
        // Another request already kicked off a refresh — queue this one
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            if (originalRequest?.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            resolve(apiClient(originalRequest!))
          })
        })
      }

      originalRequest!._retry = true
      isRefreshing = true

      try {
        // Use a plain axios instance to avoid interceptor recursion
        const response = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
          refreshToken,
        })
        const { accessToken: newToken, refreshToken: newRefreshToken, user } =
          response.data

        useAuthStore.getState().setAuth(user, newToken, newRefreshToken)
        processQueue(newToken)

        if (originalRequest?.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
        }
        return apiClient(originalRequest!)
      } catch {
        useAuthStore.getState().clearAuth()
        window.location.href = '/login'
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)