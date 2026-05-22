'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Target,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Lightbulb,
  Clock,
  BarChart3,
  Dumbbell,
} from 'lucide-react'
import type { AnalysisResult, FeedbackPoint, Exercise } from '@/types'

// ── Icon resolver ──────────────────────────────────────────────────────────

const FEEDBACK_ICONS: Record<FeedbackPoint['icon'], typeof Target> = {
  target: Target,
  'alert-triangle': AlertTriangle,
  'check-circle': CheckCircle,
  'trending-up': TrendingUp,
  lightbulb: Lightbulb,
}

const DIFFICULTY_COLORS: Record<
  Exercise['difficulty'],
  { badge: string; text: string }
> = {
  principiante: {
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    text: 'Principiante',
  },
  intermedio: {
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    text: 'Intermedio',
  },
  avanzado: {
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    text: 'Avanzado',
  },
}

// ── Props ─────────────────────────────────────────────────────────────────

export interface VideoResultsProps {
  /** Resultado del análisis (null = sin datos) */
  result: AnalysisResult | null
  /** Loading state */
  isLoading?: boolean
  /** Error message */
  error?: string | null
  /** Callback para reintentar */
  onRetry?: () => void
}

// ── Circular Score ────────────────────────────────────────────────────────

function CircularScore({ score }: { score: number }) {
  const id = useId()
  const radius = 48
  const circumference = 2 * Math.PI * radius
  const clampedScore = Math.max(0, Math.min(100, score))
  const offset = circumference - (clampedScore / 100) * circumference

  const scoreColor =
    clampedScore < 50
      ? 'stroke-red-500'
      : clampedScore < 75
        ? 'stroke-amber-500'
        : 'stroke-emerald-500'

  const scoreLabelColor =
    clampedScore < 50
      ? 'text-red-600 dark:text-red-400'
      : clampedScore < 75
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-emerald-600 dark:text-emerald-400'

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        className="drop-shadow-sm"
        role="img"
        aria-label={`Puntuación: ${clampedScore} sobre 100`}
      >
        {/* Track */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted"
          opacity={0.3}
        />
        {/* Fill */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          className={scoreColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
        {/* Text */}
        <text
          x="60"
          y="60"
          textAnchor="middle"
          dominantBaseline="central"
          className={`text-2xl font-bold ${scoreLabelColor}`}
        >
          {clampedScore}
        </text>
      </svg>
      <span className={cn('text-xs font-medium', scoreLabelColor)}>
        {clampedScore < 50
          ? 'Necesita mejorar'
          : clampedScore < 75
            ? 'Buen nivel'
            : 'Excelente'}
      </span>
    </div>
  )
}

// ── Feedback Card ─────────────────────────────────────────────────────────

function FeedbackCard({ point }: { point: FeedbackPoint }) {
  const Icon = FEEDBACK_ICONS[point.icon] ?? Lightbulb

  return (
    <Card size="sm" className="border-l-4 border-l-emerald-500">
      <CardContent className="flex items-start gap-3 py-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
          <Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{point.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {point.description}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Exercise Card ─────────────────────────────────────────────────────────

function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const difficulty = DIFFICULTY_COLORS[exercise.difficulty]

  return (
    <Card size="sm">
      <CardContent className="space-y-2 py-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium">{exercise.title}</p>
          <Badge className={cn('shrink-0 text-[10px]', difficulty.badge)}>
            {difficulty.text}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{exercise.description}</p>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="size-3" />
          <span>{exercise.duration}</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────

function ResultsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Score skeleton */}
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="size-[120px] rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Feedback skeletons */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-36" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[68px] w-full rounded-lg" />
          ))}
        </div>
      </div>

      {/* Exercises skeletons */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-44" />
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-[88px] w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
        <BarChart3 className="size-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">Sin análisis aún</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Sube un video para ver el análisis de tus golpes.
      </p>
    </div>
  )
}

// ── Results Container ─────────────────────────────────────────────────────

export function VideoResults({
  result,
  isLoading = false,
  error = null,
  onRetry,
}: VideoResultsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resultados del análisis</CardTitle>
        </CardHeader>
        <CardContent>
          <ResultsSkeleton />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error al analizar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="size-6 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-sm text-muted-foreground">{error}</p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Reintentar
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resultados del análisis</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
          Resultados del análisis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score */}
        <div className="flex justify-center">
          <CircularScore score={result.score} />
        </div>

        {/* Feedback */}
        {result.feedback_points.length > 0 && (
          <div className="space-y-3">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <Target className="size-4 text-emerald-600 dark:text-emerald-400" />
              Puntos de mejora
            </h3>
            <div className="space-y-2">
              {result.feedback_points.map((point) => (
                <FeedbackCard key={point.id} point={point} />
              ))}
            </div>
          </div>
        )}

        {/* Exercises */}
        {result.ejercicios.length > 0 && (
          <div className="space-y-3">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <Dumbbell className="size-4 text-emerald-600 dark:text-emerald-400" />
              Ejercicios recomendados
            </h3>
            <div className="space-y-2">
              {result.ejercicios.map((ejercicio) => (
                <ExerciseCard key={ejercicio.id} exercise={ejercicio} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
