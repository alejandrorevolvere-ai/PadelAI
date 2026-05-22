'use client'

import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

interface VRMode {
  id: string
  title: string
  description: string
  icon: React.ElementType<{ className?: string }>
  difficulty: string
}

interface VRModeSelectorProps {
  currentMode: string
  onModeChange: (mode: string) => void
  modes: VRMode[]
}

interface DifficultyBadgeProps {
  difficulty: string
}

// ─── Difficulty badge ───────────────────────────────────────────────────────

const difficultyColors: Record<string, string> = {
  Principiante:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
  Intermedio:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
  Avanzado:
    'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
}

function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
        difficultyColors[difficulty] ?? 'bg-gray-100 text-gray-700'
      )}
    >
      {difficulty}
    </span>
  )
}

// ─── Main Export ────────────────────────────────────────────────────────────

export default function VRModeSelector({
  currentMode,
  onModeChange,
  modes,
}: VRModeSelectorProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-end p-4">
      {/* Mode buttons at bottom center */}
      <div className="pointer-events-auto mx-auto flex flex-wrap items-center justify-center gap-2">
        {modes.map((mode) => {
          const Icon = mode.icon
          const isActive = currentMode === mode.id

          return (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium shadow-lg backdrop-blur-sm transition-all',
                isActive
                  ? 'bg-emerald-600 text-white shadow-emerald-500/30'
                  : 'bg-black/50 text-white/70 hover:bg-black/60 hover:text-white'
              )}
            >
              <Icon className="size-3.5" />
              <span>{mode.title}</span>
              <DifficultyBadge difficulty={mode.difficulty} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
