'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import type { User } from '@/types'

// ─── useAuth ────────────────────────────────────────────────────────────────
/** High-level auth hook wrapping the Zustand store & API calls */
export function useAuth() {
  const {
    user,
    isAuthenticated,
    setUser,
    clear,
  } = useAuthStore()

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await authApi.login(email, password)
      setUser(data.user)
    },
    [setUser],
  )

  const register = useCallback(
    async (email: string, name: string, password: string) => {
      const { data } = await authApi.register(email, name, password)
      setUser(data.user)
    },
    [setUser],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Ignore — clear local state regardless
    }
    clear()
  }, [clear])

  return useMemo(
    () => ({
      user,
      isAuthenticated,
      login,
      register,
      logout,
    }),
    [user, isAuthenticated, login, register, logout],
  )
}

// ─── useMe ──────────────────────────────────────────────────────────────────
/** Fetch the current user profile on mount if we have a session cookie */
export function useMe() {
  const { isAuthenticated, setUser, clear } = useAuthStore()

  useEffect(() => {
    // If we already have a user profile cached, skip initial fetch
    if (isAuthenticated) return

    let cancelled = false

    authApi
      .getMe()
      .then(({ data }) => {
        if (!cancelled) setUser(data)
      })
      .catch(() => {
        if (!cancelled) clear()
      })

    return () => {
      cancelled = true
    }
  // Only run on mount to check for existing session cookie
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return useAuth()
}
