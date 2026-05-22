'use client'

import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/types'
import { useEffect, useState } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: ChatMessage
  isLast: boolean
}

interface TypingDotsProps {
  isVisible: boolean
}

// ─── Relative timestamp ─────────────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMs = now - then
  const diffSeconds = Math.floor(diffMs / 1000)

  if (diffSeconds < 10) return 'ahora'
  if (diffSeconds < 60) return `hace ${diffSeconds} s`

  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes === 1) return 'hace 1 min'
  if (diffMinutes < 60) return `hace ${diffMinutes} min`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours === 1) return 'hace 1 h'
  if (diffHours < 24) return `hace ${diffHours} h`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'ayer'
  if (diffDays < 7) return `hace ${diffDays} días`

  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks === 1) return 'hace 1 sem'
  return `hace ${diffWeeks} sem`
}

// ─── Basic markdown renderer ────────────────────────────────────────────────

function renderMarkdown(text: string) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let inList = false
  let listItems: React.ReactNode[] = []
  let listIndex = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Detect list items (starting with - or *)
    const listMatch = line.match(/^[-*]\s+(.+)$/)
    if (listMatch) {
      inList = true
      const content = parseInlineMarkdown(listMatch[1])
      listItems.push(
        <li key={listIndex++} className="ml-5 list-disc text-sm leading-relaxed">
          {content}
        </li>,
      )
      continue
    }

    // Flush list if we were in one
    if (inList) {
      elements.push(
        <ul key={`list-${i}`} className="my-1 space-y-0.5">
          {listItems}
        </ul>,
      )
      listItems = []
      inList = false
    }

    // Empty line
    if (line.trim() === '') {
      elements.push(<br key={`br-${i}`} />)
      continue
    }

    elements.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed">
        {parseInlineMarkdown(line)}
      </p>,
    )
  }

  // Flush remaining list
  if (inList) {
    elements.push(
      <ul key="list-end" className="my-1 space-y-0.5">
        {listItems}
      </ul>,
    )
  }

  return elements
}

function parseInlineMarkdown(text: string): React.ReactNode {
  // Bold: **text** → <strong>text</strong>
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

// ─── Typing dots animation ──────────────────────────────────────────────────

function TypingDots({ isVisible }: TypingDotsProps) {
  if (!isVisible) return null

  return (
    <span className="inline-flex items-center gap-1">
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
    </span>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function MessageBubble({ message, isLast }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isTyping = isUser ? false : message.content === ''

  return (
    <div
      className={cn(
        'flex w-full gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      {/* Avatar — solo assistant */}
      {!isUser && (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm dark:bg-emerald-900/50">
          🏓
        </div>
      )}

      {/* Bubble */}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5',
          isUser
            ? 'bg-emerald-600 text-white'
            : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100',
          !isUser && 'rounded-tl-sm',
          isUser && 'rounded-tr-sm',
        )}
      >
        {/* Content */}
        {isTyping ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Escribiendo</span>
            <TypingDots isVisible />
          </div>
        ) : (
          <div className="[&_strong]:font-semibold">
            {renderMarkdown(message.content)}
          </div>
        )}

        {/* Timestamp */}
        {!isTyping && (
          <span
            className={cn(
              'mt-1 block text-[10px] leading-none',
              isUser
                ? 'text-emerald-200'
                : 'text-zinc-400 dark:text-zinc-500',
            )}
          >
            {formatRelativeTime(message.created_at)}
          </span>
        )}
      </div>
    </div>
  )
}
