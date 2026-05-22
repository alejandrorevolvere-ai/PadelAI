'use client'

import { useMe } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useChat, useConversations } from '@/hooks/useChat'
import ChatWindow from '@/components/chat/ChatWindow'
import {
  MessageSquare,
  Plus,
  PanelLeftOpen,
  PanelLeftClose,
  Trash2,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Time formatting helper ─────────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMs = now - then
  const diffSeconds = Math.floor(diffMs / 1000)

  if (diffSeconds < 60) return 'ahora'
  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `hace ${diffMinutes} min`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `hace ${diffHours} h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `hace ${diffDays} días`
  const diffWeeks = Math.floor(diffDays / 7)
  return `hace ${diffWeeks} sem`
}

// ─── Skeleton for the full page ─────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="flex h-full" role="status" aria-label="Cargando chat...">
      {/* Sidebar skeleton */}
      <div className="hidden w-72 shrink-0 border-r p-4 md:flex md:flex-col">
        <Skeleton className="mb-4 h-9 w-full rounded-lg" />
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
      {/* Chat skeleton */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-3 border-b px-6 py-4">
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="size-20 rounded-full" />
            <Skeleton className="h-6 w-56" />
          </div>
        </div>
        <div className="border-t p-6">
          <Skeleton className="h-[44px] w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const auth = useMe()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [activeConversation, setActiveConversation] = useState<string | null>(null)

  const { conversations, isLoading: convsLoading, createConversation } = useConversations()
  const { messages, isLoading, sendMessage } = useChat({
    conversationId: activeConversation,
  })

  // Auth guard
  useEffect(() => {
    if (!auth.isAuthenticated) {
      router.push('/login')
    }
  }, [auth.isAuthenticated, router])

  // Simulate typing indicator when sending
  const handleSend = useCallback(async (content: string) => {
    setIsTyping(true)
    try {
      await sendMessage(content)
    } finally {
      setIsTyping(false)
    }
  }, [sendMessage])

  // Create new conversation
  const handleNewConversation = useCallback(async () => {
    try {
      const conv = await createConversation()
      setActiveConversation(conv.id)
      setSidebarOpen(false)
    } catch {
      // silently fail
    }
  }, [createConversation])

  // Loading state
  if (!auth.isAuthenticated) {
    return auth.user === null ? null : <PageSkeleton />
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="Lista de conversaciones"
        className={cn(
          // Mobile: slide-in overlay
          'fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col border-r bg-background transition-transform duration-200 md:relative md:z-auto md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between border-b px-4 py-4">
          <h2 className="text-sm font-semibold tracking-tight">
            Conversaciones
          </h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden"
            aria-label="Cerrar panel de conversaciones"
          >
            <PanelLeftClose className="size-4" aria-hidden="true" />
          </Button>
        </div>

        {/* New conversation button */}
        <div className="px-3 pt-3 pb-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            size="sm"
            onClick={handleNewConversation}
            disabled={convsLoading}
            aria-label="Crear nueva conversación"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Nueva conversación
          </Button>
        </div>

        {/* Conversation list */}
        <nav className="flex-1 overflow-y-auto px-3 pb-3" aria-label="Conversaciones recientes">
          {convsLoading ? (
            <div className="flex flex-col gap-2 pt-2" role="status" aria-label="Cargando conversaciones...">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <p className="px-3 pt-4 text-center text-sm text-muted-foreground">
              No hay conversaciones aún
            </p>
          ) : (
            conversations.map((conv) => {
              const isActive = activeConversation === conv.id
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => {
                    setActiveConversation(conv.id)
                    setSidebarOpen(false)
                  }}
                  aria-current={isActive ? "true" : undefined}
                  aria-label={`${conv.title}${conv.last_message ? ` — ${conv.last_message}` : ''}`}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                      : 'hover:bg-muted',
                  )}
                >
                  <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{conv.title}</p>
                    {conv.last_message && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {conv.last_message}
                      </p>
                    )}
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/60">
                      <Clock className="size-3" aria-hidden="true" />
                      {formatRelativeTime(conv.updated_at)}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t px-3 py-3">
          <p className="text-[10px] text-muted-foreground/40">
            Historial de conversaciones
          </p>
        </div>
      </aside>

      {/* Main chat area */}
      <main className="flex flex-1 flex-col overflow-hidden" role="main" aria-label="Ventana de chat">
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          isTyping={isTyping}
          onSend={handleSend}
          isInitialLoading={false}
          headerActions={
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden"
              aria-label="Abrir conversaciones"
            >
              <PanelLeftOpen className="size-4" aria-hidden="true" />
              <span className="sr-only">Abrir conversaciones</span>
            </Button>
          }
        />
      </main>
    </div>
  )
}
