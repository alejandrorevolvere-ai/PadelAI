import { create } from 'zustand'
import type { User } from '@/types'
import { persist } from 'zustand/middleware'

// ─── Types ──────────────────────────────────────────────────────────────────
interface AuthState {
  /** Authenticated user profile (null when logged out) */
  user: User | null
  /** Derived shortcut – true when user is present */
  isAuthenticated: boolean
}

interface AuthActions {
  /** Persist user profile after fetch or login */
  setUser: (user: User) => void
  /** Wipe everything – called on logout or expired session */
  clear: () => void
}

type AuthStore = AuthState & AuthActions

// ─── Store ──────────────────────────────────────────────────────────────────
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // ── State ───────────────────────────────────────────────────────────
      user: null,
      isAuthenticated: false,

      // ── Actions ─────────────────────────────────────────────────────────
      setUser: (user: User) =>
        set({
          user,
          isAuthenticated: true,
        }),

      clear: () =>
        set({
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'padel-ai-auth',
      // Only persist user profile — tokens are in httpOnly cookies
      partialize: (state: AuthStore) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
