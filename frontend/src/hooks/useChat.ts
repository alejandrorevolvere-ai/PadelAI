'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { chatApi, extractApiError, type ApiError } from '@/lib/api'
import type { ChatMessage, Conversation } from '@/types'

// ─── Config ─────────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 3000

// ─── Types ──────────────────────────────────────────────────────────────────
interface UseChatOptions {
  /** Backend conversation ID */
  conversationId: string | null
}

interface UseChatReturn {
  /** Ordered list of messages */
  messages: ChatMessage[]
  /** True while a send is in flight */
  isLoading: boolean
  /** Error from last operation */
  error: ApiError | null
  /** Send a new user message */
  sendMessage: (content: string) => Promise<void>
  /** Manually trigger a poll */
  refresh: () => Promise<void>
  /** Clear any error */
  clearError: () => void
}

// ─── Conversations hook ──────────────────────────────────────────────────────
interface UseConversationsReturn {
  conversations: Conversation[]
  isLoading: boolean
  error: ApiError | null
  createConversation: (title?: string) => Promise<Conversation>
  deleteConversation: (id: string) => Promise<void>
  refreshConversations: () => Promise<void>
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)

  const refreshConversations = useCallback(async () => {
    try {
      const { data } = await chatApi.getConversations()
      setConversations(data)
      setError(null)
    } catch (err) {
      setError(extractApiError(err))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createConversation = useCallback(async (title?: string): Promise<Conversation> => {
    const { data } = await chatApi.createConversation(title)
    setConversations((prev) => [data, ...prev])
    return data
  }, [])

  const deleteConversation = useCallback(async (id: string) => {
    await chatApi.deleteConversation(id)
    setConversations((prev) => prev.filter((c) => c.id !== id))
  }, [])

  useEffect(() => {
    refreshConversations()
  }, [refreshConversations])

  return { conversations, isLoading, error, createConversation, deleteConversation, refreshConversations }
}

// ─── Chat hook ───────────────────────────────────────────────────────────────
export function useChat({ conversationId }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<{ close: () => void } | null>(null)

  // ── Clear error ───────────────────────────────────────────────────────────
  const clearError = useCallback(() => setError(null), [])

  // ── Fetch messages ────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!conversationId) return
    try {
      const { data } = await chatApi.getMessages(conversationId)
      setMessages(data)
      setError(null)
    } catch {
      // Silently fail – next poll will retry
    }
  }, [conversationId])

  // ── Polling ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      return
    }

    refresh() // initial fetch

    pollRef.current = setInterval(refresh, POLL_INTERVAL_MS)

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [refresh, conversationId])

  // ── Clean up stream on unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      streamRef.current?.close()
    }
  }, [])

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId) return
      setIsLoading(true)
      setError(null)

      // Optimistic add so the user sees their message immediately
      const tempId = `temp-${Date.now()}`
      const optimisticMessage: ChatMessage = {
        id: tempId,
        conversation_id: conversationId,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, optimisticMessage])

      // Try SSE streaming first
      let usedStream = false

      streamRef.current = chatApi.sendMessageStream(
        conversationId,
        content,
        // onToken
        (token) => {
          usedStream = true
          setMessages((prev) => {
            const last = prev[prev.length - 1]
            // Append to the last assistant message or create one
            if (last && last.role === 'assistant' && !last.id.startsWith('temp-')) {
              return [
                ...prev.slice(0, -1),
                { ...last, content: last.content + token },
              ]
            }
            return [
              ...prev,
              {
                id: `stream-${Date.now()}`,
                conversation_id: conversationId,
                role: 'assistant',
                content: token,
                created_at: new Date().toISOString(),
              } satisfies ChatMessage,
            ]
          })
        },
        // onDone
        () => {
          setIsLoading(false)
          if (usedStream) refresh() // sync final state
        },
        // onError
        (err) => {
          // If SSE failed, fall through to polling path
          if (!usedStream) return
          setError(err)
          setIsLoading(false)
          refresh()
        },
      )

      // Wait a tiny bit — if SSE didn't start within 500ms, fall back to polling
      await new Promise((resolve) => setTimeout(resolve, 500))

      if (!usedStream) {
        // Fallback: blocking POST + poll
        try {
          await chatApi.sendMessage(conversationId, content)
          // Force an immediate poll so the assistant reply comes through
          await refresh()
        } catch (err) {
          setError(extractApiError(err))
        } finally {
          setIsLoading(false)
        }
      }
    },
    [conversationId, refresh],
  )

  return { messages, isLoading, error, sendMessage, refresh, clearError }
}
