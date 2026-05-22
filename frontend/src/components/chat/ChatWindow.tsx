'use client'

import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { ChatMessage } from '@/types'
import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatWindowProps {
  messages: ChatMessage[]
  isLoading: boolean
  isTyping?: boolean
  onSend: (content: string) => void
  /** Show skeletons while initial data loads */
  isInitialLoading?: boolean
  /** Optional slot for extra header actions */
  headerActions?: React.ReactNode
}

// ─── Status badge ───────────────────────────────────────────────────────────

function StatusBadge({ isTyping }: { isTyping: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-none',
        isTyping
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          isTyping
            ? 'animate-pulse bg-amber-500'
            : 'bg-emerald-500',
        )}
      />
      {isTyping ? 'Escribiendo...' : 'Conectado'}
    </span>
  )
}

// ─── Loading skeleton ───────────────────────────────────────────────────────

function ChatLoadingSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-4">
      {/* Messages skeleton */}
      {[1, 2, 3].map((i) => {
        const isRight = i % 2 === 0
        return (
          <div
            key={i}
            className={cn(
              'flex w-full gap-3',
              isRight && 'flex-row-reverse',
            )}
          >
            {!isRight && (
              <Skeleton className="size-8 shrink-0 rounded-full" />
            )}
            <div className="flex flex-col gap-1.5">
              <Skeleton
                className={cn(
                  'h-10 rounded-2xl',
                  isRight ? 'rounded-tr-sm' : 'rounded-tl-sm',
                  i === 1 ? 'w-56' : i === 2 ? 'w-72' : 'w-48',
                )}
              />
              <Skeleton className="h-3 w-14 rounded-full" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Empty state ────────────────────────────────────────────────────────────

function ChatEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
      {/* Avatar */}
      <div className="flex size-20 items-center justify-center rounded-full bg-emerald-100 text-4xl dark:bg-emerald-900/40">
        🏓
      </div>

      <div className="text-center">
        <h2 className="text-xl font-semibold tracking-tight">
          ¿En qué puedo ayudarte hoy?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pregúntame sobre técnica, táctica, ejercicios o cualquier duda de pádel
        </p>
      </div>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function ChatWindow({
  messages,
  isLoading,
  isTyping = false,
  onSend,
  isInitialLoading = false,
  headerActions,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const isManualScrollRef = useRef(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isManualScrollRef.current) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Detect manual scroll to pause auto-scroll
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      isManualScrollRef.current = !isNearBottom
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  const hasMessages = messages.length > 0
  const showSkeleton = isInitialLoading && !hasMessages

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-600 text-sm text-white">
            🏓
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">
              Chat Coach
            </h1>
            <StatusBadge isTyping={isTyping} />
          </div>
        </div>
        {headerActions}
      </div>

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
      >
        {showSkeleton ? (
          <ChatLoadingSkeleton />
        ) : hasMessages ? (
          <div className="flex flex-col gap-4 px-6 py-4">
            {messages.map((msg, idx) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isLast={idx === messages.length - 1}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        ) : (
          <ChatEmptyState />
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t bg-background px-6 py-4">
        <ChatInput onSend={onSend} isLoading={isLoading} />
      </div>
    </div>
  )
}
