'use client'

import { cn } from '@/lib/utils'
import { Send } from 'lucide-react'
import { type KeyboardEvent, useCallback, useEffect, useRef } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatInputProps {
  onSend: (content: string) => void
  isLoading: boolean
  disabled?: boolean
  /** Optional external value for controlled mode */
  value?: string
  onChange?: (value: string) => void
}

// ─── Quick suggestions ──────────────────────────────────────────────────────

const quickSuggestions = [
  '¿Cómo mejorar mi bandeja?',
  'Ejercicios para hoy',
  'Analiza mi técnica',
]

// ─── Component ──────────────────────────────────────────────────────────────

export default function ChatInput({
  onSend,
  isLoading,
  disabled = false,
  value: externalValue,
  onChange: externalOnChange,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Simple internal state when uncontrolled
  const internalValueRef = useRef('')

  const getValue = useCallback(() => {
    if (externalValue !== undefined) return externalValue
    return internalValueRef.current
  }, [externalValue])

  const setValue = useCallback(
    (newValue: string) => {
      if (externalValue !== undefined) {
        externalOnChange?.(newValue)
      } else {
        internalValueRef.current = newValue
      }
    },
    [externalValue, externalOnChange],
  )

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const lineHeight = 24 // ~1.5rem at text-sm
    const maxHeight = lineHeight * 4 // 4 lines max
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
  }, [])

  // Resize on value change
  useEffect(() => {
    autoResize()
  }, [externalValue, autoResize])

  const handleSend = useCallback(() => {
    const text = getValue().trim()
    if (!text || isLoading || disabled) return
    onSend(text)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.value = ''
      textareaRef.current.style.height = 'auto'
    }
  }, [getValue, isLoading, disabled, onSend, setValue])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const handleSuggestion = useCallback(
    (suggestion: string) => {
      setValue(suggestion)
      if (textareaRef.current) {
        textareaRef.current.value = suggestion
        autoResize()
      }
      // Auto-send after a brief delay so the UI updates
      setTimeout(() => {
        onSend(suggestion)
        setValue('')
        if (textareaRef.current) {
          textareaRef.current.value = ''
          textareaRef.current.style.height = 'auto'
        }
      }, 50)
    },
    [onSend, setValue, autoResize],
  )

  const isDisabled = isLoading || disabled

  return (
    <div className="space-y-3">
      {/* Textarea + button */}
      <div className="relative flex items-end gap-2">
        <textarea
          ref={textareaRef}
          defaultValue={externalValue !== undefined ? undefined : ''}
          value={externalValue}
          onChange={(e) => {
            externalOnChange?.(e.target.value)
            autoResize()
          }}
          onKeyDown={handleKeyDown}
          placeholder="Pregúntale a tu coach..."
          disabled={isDisabled}
          rows={1}
          className={cn(
            'min-h-[44px] w-full resize-none rounded-xl border border-input bg-background px-4 py-3 pr-12 text-sm leading-6 outline-none transition-colors',
            'placeholder:text-muted-foreground/60',
            'focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        />

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={isDisabled}
          className={cn(
            'absolute bottom-2 right-2 flex size-8 shrink-0 items-center justify-center rounded-lg transition-all',
            isDisabled
              ? 'cursor-not-allowed text-muted-foreground/40'
              : 'cursor-pointer text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50',
          )}
          aria-label="Enviar mensaje"
        >
          <Send className="size-4" />
        </button>
      </div>

      {/* Quick suggestions */}
      <div className="flex flex-wrap gap-2">
        {quickSuggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => handleSuggestion(suggestion)}
            disabled={isDisabled}
            className={cn(
              'rounded-full border border-dashed border-muted-foreground/30 px-3 py-1.5 text-xs font-medium transition-colors',
              'text-muted-foreground hover:border-emerald-400 hover:text-emerald-600',
              'dark:hover:border-emerald-500 dark:hover:text-emerald-400',
              'disabled:cursor-not-allowed disabled:opacity-40',
            )}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}
