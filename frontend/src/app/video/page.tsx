'use client'

import { useState, useCallback, useEffect, lazy, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading'
import { videoApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  Video,
  Plus,
  Clock,
  TrendingUp,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import type {
  UploadState,
  AnalysisState,
  AnalysisResult,
  VideoAnalysisHistory,
} from '@/types'

// ── Dynamic imports for heavy components ──────────────────────────────────────

const VideoUploader = lazy(() =>
  import('@/components/video/VideoUploader').then((m) => ({ default: m.VideoUploader }))
)
const VideoResults = lazy(() =>
  import('@/components/video/VideoResults').then((m) => ({ default: m.VideoResults }))
)

function VideoSectionFallback() {
  return (
    <div className="flex aspect-video items-center justify-center rounded-xl border bg-card">
      <LoadingSpinner size="lg" label="Cargando..." />
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 7) return `Hace ${days} días`
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getScoreColor(score: number): string {
  if (score < 50) return 'text-red-600 dark:text-red-400'
  if (score < 75) return 'text-amber-600 dark:text-amber-400'
  return 'text-emerald-600 dark:text-emerald-400'
}

function getScoreBgColor(score: number): string {
  if (score < 50) return 'bg-red-100 dark:bg-red-900/30'
  if (score < 75) return 'bg-amber-100 dark:bg-amber-900/30'
  return 'bg-emerald-100 dark:bg-emerald-900/30'
}

// ── History Card ──────────────────────────────────────────────────────────

function HistoryCard({
  item,
  onView,
}: {
  item: VideoAnalysisHistory
  onView: (id: string) => void
}) {
  return (
    <Card
      size="sm"
      className="group cursor-pointer transition-all hover:shadow-md"
      onClick={() => onView(item.analysis_id)}
      role="button"
      tabIndex={0}
      aria-label={`Ver análisis: ${item.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onView(item.analysis_id)
        }
      }}
    >
      <CardContent className="p-0">
        {/* Thumbnail placeholder */}
        <div className="flex aspect-video items-center justify-center rounded-t-xl bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/30">
          <Video className="size-8 text-emerald-500/60" aria-hidden="true" />
        </div>

        {/* Info */}
        <div className="space-y-2 p-3">
          <p className="truncate text-sm font-medium">{item.title}</p>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="size-3" aria-hidden="true" />
              {formatDate(item.created_at)}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                getScoreBgColor(item.score),
                getScoreColor(item.score)
              )}
            >
              <TrendingUp className="size-3" aria-hidden="true" />
              {item.score}
            </span>
          </div>
          <Button
            variant="ghost"
            size="xs"
            className="w-full justify-between text-xs"
            onClick={(e) => {
              e.stopPropagation()
              onView(item.analysis_id)
            }}
            aria-label={`Ver análisis detallado de ${item.title}`}
          >
            Ver análisis
            <ChevronRight className="size-3" aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function VideoPage() {
  // Core state
  const [analysisState, setAnalysisState] = useState<AnalysisState>('idle')
  const [uploadState, setUploadState] = useState<UploadState>('empty')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  // History from API
  const [history, setHistory] = useState<VideoAnalysisHistory[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  // ── Fetch history on mount ──────────────────────────────────────────────
  useEffect(() => {
    videoApi
      .getAnalysisHistory()
      .then(({ data }) => {
        setHistory(
          data.map((item) => ({
            id: item.id,
            title: item.title,
            score: item.score ?? 0,
            created_at: item.created_at,
            analysis_id: item.analysis_id ?? item.id,
            thumbnail_url: item.thumbnail_url,
          }))
        )
      })
      .catch(() => {
        // Silently fail — empty history
      })
      .finally(() => setHistoryLoading(false))
  }, [])

  // ── Upload / Analyze flow ───────────────────────────────────────────────

  const handleAnalyze = useCallback(
    async ({
      file,
      title,
      description,
    }: {
      file: File
      title: string
      description: string
    }) => {
      setAnalysisState('uploading')
      setUploadState('uploading')
      setAnalysisError(null)

      try {
        const { data } = await videoApi.uploadVideo(file, (pct) => {
          setUploadProgress(pct)
        })

        setUploadProgress(100)
        setUploadState('success')
        setAnalysisState('results')

        const analysis = data.analysis
        setCurrentResult({
          id: analysis.id,
          video_title: title || file.name,
          score: analysis.score,
          feedback_points: analysis.feedback_points,
          ejercicios: analysis.ejercicios,
          created_at: analysis.created_at,
          thumbnail_url: undefined,
        })

        // Refresh history
        videoApi
          .getAnalysisHistory()
          .then(({ data: newHistory }) => {
            setHistory(
              newHistory.map((item) => ({
                id: item.id,
                title: item.title,
                score: item.score ?? 0,
                created_at: item.created_at,
                analysis_id: item.analysis_id ?? item.id,
                thumbnail_url: item.thumbnail_url,
              }))
            )
          })
          .catch(() => {})

        toast.success('Análisis completado')
      } catch (err) {
        setUploadState('error')
        setAnalysisState('idle')
        const msg =
          err instanceof Error ? err.message : 'Error al procesar el video'
        setAnalysisError(msg)
        toast.error('Error al analizar el video')
      }
    },
    []
  )

  const handleCancel = useCallback(() => {
    setUploadState('empty')
    setAnalysisState('idle')
    setUploadProgress(0)
  }, [])

  const handleRetry = useCallback(() => {
    setAnalysisError(null)
    setCurrentResult(null)
    setUploadState('empty')
    setAnalysisState('idle')
    setUploadProgress(0)
  }, [])

  const handleViewHistory = useCallback(
    (analysisId: string) => {
      // ── TODO: navigate to detail or load from API ──
      toast.info(`Cargando análisis ${analysisId}...`)
    },
    []
  )

  const handleNewUpload = useCallback(() => {
    setCurrentResult(null)
    setAnalysisError(null)
    setUploadState('empty')
    setAnalysisState('idle')
    setUploadProgress(0)
  }, [])

  // ── Derived ──────────────────────────────────────────────────────────────

  const showResults = analysisState === 'results' || currentResult !== null
  const isProcessing =
    analysisState === 'uploading' || analysisState === 'processing'

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Analiza tus golpes con IA
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sube un video de tu entrenamiento y recibe feedback detallado con
          ejercicios personalizados para mejorar tu juego.
        </p>
      </div>

      {/* ── Main Grid: Uploader + Results ────────────────────────── */}
      <div className="mb-10 grid gap-6 lg:grid-cols-2">
        {/* Left: Uploader */}
        <div>
          {showResults ? (
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {currentResult?.video_title ?? 'Video analizado'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Análisis completado
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleNewUpload}>
                  <Plus className="mr-1 size-3.5" aria-hidden="true" />
                  Subir nuevo
                </Button>
              </div>

              {/* Mini preview of uploaded video (placeholder) */}
              <div className="flex aspect-video items-center justify-center rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/30">
                <Video className="size-10 text-emerald-500/60" aria-hidden="true" />
              </div>
            </div>
          ) : (
            <Suspense fallback={<VideoSectionFallback />}>
              <VideoUploader
                onAnalyze={handleAnalyze}
                onCancel={handleCancel}
                uploadProgress={uploadProgress}
                externalState={uploadState}
                disabled={isProcessing}
              />
            </Suspense>
          )}
        </div>

        {/* Right: Results */}
        <div>
          <Suspense fallback={<VideoSectionFallback />}>
            <VideoResults
              result={currentResult}
              isLoading={isProcessing && uploadProgress >= 100}
              error={analysisError}
              onRetry={handleRetry}
            />
          </Suspense>
        </div>
      </div>

      {/* ── History ──────────────────────────────────────────────── */}
      {history.length > 0 ? (
        <section aria-labelledby="history-title">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="history-title" className="text-lg font-semibold">Análisis anteriores</h2>
            <span className="text-xs text-muted-foreground">
              {history.length} análisis
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {history.map((item) => (
              <HistoryCard
                key={item.id}
                item={item}
                onView={handleViewHistory}
              />
            ))}
          </div>
        </section>
      ) : (
        /* Empty history state */
        <section aria-labelledby="history-title">
          <h2 id="history-title" className="mb-4 text-lg font-semibold">Análisis anteriores</h2>
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
                <Video className="size-5 text-muted-foreground" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium">Sin análisis aún</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Tus análisis aparecerán aquí después de subir tu primer video.
              </p>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── Processing overlay (full page processing state) ──────── */}
      {isProcessing && uploadProgress < 100 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" role="progressbar" aria-label="Procesando video" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100}>
          <Card className="mx-4 max-w-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="inline-block size-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" aria-hidden="true" />
                Procesando video...
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.min(uploadProgress, 100)}%` }}
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {uploadProgress < 100
                  ? `Subiendo... ${Math.round(uploadProgress)}%`
                  : 'IA analizando tu técnica...'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
