import axios, { type AxiosError, type AxiosResponse } from 'axios'
import type { AuthResponse, AuthTokens, ChatMessage, Conversation, Subscription, SubscriptionPlan, User, VRSession } from '@/types'

// ─── API URL from env ────────────────────────────────────────────────────────
const apiUrl =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) ||
  'http://localhost:8000/api/v1'

// ─── Custom error type ──────────────────────────────────────────────────────
export interface ApiError {
  status: number
  message: string
  details?: Record<string, string[]>
}

export function extractApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<{ detail?: string; message?: string; details?: Record<string, string[]> }>
    const status = axiosErr.response?.status ?? 0
    const data = axiosErr.response?.data
    return {
      status,
      message: data?.detail ?? data?.message ?? axiosErr.message ?? 'Error de conexión',
      details: data?.details,
    }
  }
  if (error instanceof Error) {
    return { status: 0, message: error.message }
  }
  return { status: 0, message: 'Error desconocido' }
}

// ─── Base instance ──────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: apiUrl,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // sends httpOnly cookies automatically
})

// ─── Response interceptor: catch 401 — clear session ────────────────────────
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear local user data
      const { useAuthStore } = await import('@/lib/auth-store')
      useAuthStore.getState().clear()
    }
    return Promise.reject(error)
  },
)

// ─── Auth API ───────────────────────────────────────────────────────────────
export const authApi = {
  register: (email: string, name: string, password: string) =>
    api.post<AuthResponse>('/auth/register', { email, name, password }),

  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),

  refresh: () =>
    api.post<AuthResponse>('/auth/refresh'),

  getMe: () => api.get<User>('/users/me'),

  updateMe: (data: Partial<Pick<User, 'name' | 'email'>>) =>
    api.patch<User>('/users/me', data),

  logout: () => api.post('/auth/logout'),
}

// ─── Subscription API ───────────────────────────────────────────────────────
export const subsApi = {
  getPlans: () => api.get<SubscriptionPlan[]>('/subscriptions/plans'),

  getCurrentSub: () => api.get<Subscription>('/subscriptions/current'),

  createCheckoutSession: (planId: string) =>
    api.post<{ url: string }>('/subscriptions/create-checkout', { plan_id: planId }),
}

// ─── Chat API ───────────────────────────────────────────────────────────────
export const chatApi = {
  /** Send a message and get assistant reply (blocking) */
  sendMessage: (conversationId: string, content: string) =>
    api.post<ChatMessage[]>(`/chat/conversations/${conversationId}/messages`, { message: content }),

  /** Send a message and stream the reply via SSE */
  sendMessageStream: (
    conversationId: string,
    content: string,
    onToken: (token: string) => void,
    onDone: () => void,
    onError: (err: ApiError) => void,
    signal?: AbortSignal,
  ): { close: () => void } => {
    const url = `${apiUrl}/chat/conversations/${conversationId}/messages/stream`
    const controller = new AbortController()

    const fetchStream = async () => {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // sends httpOnly cookies
          body: JSON.stringify({ message: content }),
          signal: signal
            ? AbortSignal.any([controller.signal, signal])
            : controller.signal,
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          onError({
            status: response.status,
            message: errData.detail ?? errData.message ?? `Error ${response.status}`,
          })
          return
        }

        const reader = response.body?.getReader()
        if (!reader) {
          onError({ status: 0, message: 'No se pudo leer el stream' })
          return
        }

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') {
                onDone()
                return
              }
              try {
                const parsed = JSON.parse(data)
                if (parsed.token) onToken(parsed.token)
                if (parsed.content) onToken(parsed.content)
                if (parsed.done) {
                  onDone()
                  return
                }
              } catch {
                onToken(data)
              }
            }
          }
        }
        onDone()
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        onError(extractApiError(err))
      }
    }

    fetchStream()

    return {
      close: () => { controller.abort() },
    }
  },

  /** List user conversations */
  getConversations: () => api.get<Conversation[]>('/chat/conversations'),

  /** Create a new conversation */
  createConversation: (title?: string) =>
    api.post<Conversation>('/chat/conversations', { title }),

  /** Get messages for a conversation */
  getMessages: (conversationId: string) =>
    api.get<ChatMessage[]>(`/chat/conversations/${conversationId}/messages`),

  /** Delete a conversation */
  deleteConversation: (conversationId: string) =>
    api.delete(`/chat/conversations/${conversationId}`),
}

// ─── Video Analysis API ──────────────────────────────────────────────────────
export const videoApi = {
  uploadVideo: (file: File, onProgress?: (pct: number) => void) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<{ id: string; status: string; analysis: { id: string; score: number; summary: string | null; feedback_points: any[]; ejercicios: any[]; created_at: string } }>('/video/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(pct)
        }
      },
    })
  },

  getAnalysisStatus: (videoId: string) =>
    api.get<{ status: string; progress: number }>(`/video/${videoId}/status`),

  getAnalysisHistory: () =>
    api.get<Array<{ id: string; title: string; score: number | null; analysis_id: string | null; status: string; created_at: string; thumbnail_url?: string }>>(
      '/video/history',
    ),
}

// ─── VR API ──────────────────────────────────────────────────────────────────
export const vrApi = {
  getVRSessions: () => api.get<VRSession[]>('/vr/sessions'),

  saveVRSession: (data: { title: string; duration_seconds: number; score?: number; feedback?: string }) =>
    api.post<VRSession>('/vr/sessions', data),
}

export default api
