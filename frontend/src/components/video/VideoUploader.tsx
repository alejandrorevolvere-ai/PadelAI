'use client'

import { useCallback, useRef, useState, useId } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Upload,
  Film,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Play,
} from 'lucide-react'
import { toast } from 'sonner'
import type { UploadState } from '@/types'

const ACCEPTED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo']
const ACCEPTED_EXTENSIONS = '.mp4,.mov,.avi'
const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB

export interface VideoUploaderProps {
  /** Callback cuando el video se sube y está listo para analizar */
  onAnalyze?: (data: {
    file: File
    title: string
    description: string
  }) => void
  /** Callback cuando se cancela la subida */
  onCancel?: () => void
  /** Progreso de subida 0-100 */
  uploadProgress?: number
  /** Estado externo (útil si el padre maneja la subida) */
  externalState?: UploadState
  /** Deshabilitar interacción */
  disabled?: boolean
}

export function VideoUploader({
  onAnalyze,
  onCancel,
  uploadProgress = 0,
  externalState,
  disabled = false,
}: VideoUploaderProps) {
  const formId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [internalState, setInternalState] = useState<UploadState>('empty')
  const [file, setFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)

  const state = externalState ?? internalState

  const reset = useCallback(() => {
    setFile(null)
    setVideoPreview(null)
    setTitle('')
    setDescription('')
    setInternalState('empty')
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [])

  const validateFile = useCallback((f: File): string | null => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return 'Formato no soportado. Solo se aceptan .mp4, .mov y .avi.'
    }
    if (f.size > MAX_FILE_SIZE) {
      return 'El archivo supera el tamaño máximo de 500MB.'
    }
    return null
  }, [])

  const handleFile = useCallback(
    (f: File) => {
      const error = validateFile(f)
      if (error) {
        toast.error(error)
        return
      }
      setFile(f)
      setTitle(f.name.replace(/\.[^.]+$/, ''))
      setInternalState('selected')
      // Crear preview URL
      const url = URL.createObjectURL(f)
      setVideoPreview(url)
    },
    [validateFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) {
        handleFile(droppedFile)
      }
    },
    [handleFile]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (selectedFile) {
        handleFile(selectedFile)
      }
    },
    [handleFile]
  )

  const handleAnalyze = useCallback(() => {
    if (!file) return
    if (!title.trim()) {
      toast.error('Por favor ingresa un título para el video.')
      return
    }
    setInternalState('uploading')
    onAnalyze?.({ file, title: title.trim(), description: description.trim() })
  }, [file, title, description, onAnalyze])

  const handleCancel = useCallback(() => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview)
    }
    reset()
    onCancel?.()
  }, [videoPreview, reset, onCancel])

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // ── Render helpers ──────────────────────────────────────────────────────

  const renderDropZone = () => (
    <div
      className={cn(
        'relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all',
        isDragOver
          ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-950/30'
          : 'border-muted-foreground/25 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:border-emerald-500/60 dark:hover:bg-emerald-950/20',
        disabled && 'pointer-events-none opacity-50'
      )}
      onClick={() => inputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
      aria-label="Arrastra tu video aquí o haz clic para seleccionar"
    >
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
        <Upload className="size-6 text-emerald-600 dark:text-emerald-400" />
      </div>
      <p className="text-sm font-medium">
        Arrastra tu video aquí o haz clic para seleccionar
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        MP4, MOV, AVI &bull; Máx 500MB
      </p>
    </div>
  )

  const renderSelected = () => (
    <div className="space-y-4">
      {/* Preview */}
      <div className="group relative overflow-hidden rounded-xl bg-black">
        {videoPreview && (
          <video
            src={videoPreview}
            className="aspect-video w-full object-contain"
            controls
            preload="metadata"
          />
        )}
        <button
          type="button"
          onClick={handleCancel}
          className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
          aria-label="Eliminar video"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* File info */}
      <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
        <Film className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file?.name}</p>
          <p className="text-xs text-muted-foreground">
            {file && formatFileSize(file.size)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleCancel}
          disabled={disabled}
          aria-label="Quitar archivo"
        >
          <X className="size-3.5" />
        </Button>
      </div>

      {/* Title + Description */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-title`}>Título del video</Label>
          <Input
            id={`${formId}-title`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Revés de derecha"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-description`}>
            Descripción{' '}
            <span className="text-muted-foreground">(opcional)</span>
          </Label>
          <textarea
            id={`${formId}-description`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe qué golpe estás practicando..."
            rows={3}
            disabled={disabled}
            className={cn(
              'h-auto w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
              'dark:bg-input/30 dark:disabled:bg-input/80'
            )}
          />
        </div>
      </div>

      {/* Analyze button */}
      <Button
        className="w-full"
        size="lg"
        onClick={handleAnalyze}
        disabled={disabled || !title.trim()}
      >
        <Play className="size-4" />
        Analizar golpe
      </Button>
    </div>
  )

  const renderUploading = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
        <Loader2 className="size-5 shrink-0 animate-spin text-emerald-600 dark:text-emerald-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Subiendo video...</p>
          <p className="text-xs text-muted-foreground">
            {uploadProgress < 100
              ? `Procesando archivo (${uploadProgress}%)`
              : 'Procesando...'}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-300 ease-out"
          style={{ width: `${Math.min(uploadProgress, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-center">
        <p className="text-xs text-muted-foreground">
          {uploadProgress < 100
            ? `Subiendo... ${uploadProgress}%`
            : 'Preparando análisis...'}
        </p>
      </div>
    </div>
  )

  const renderSuccess = () => (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
        <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div>
        <p className="font-semibold text-emerald-600 dark:text-emerald-400">
          ¡Video subido correctamente!
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {file?.name} — {file && formatFileSize(file.size)}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={reset}>
        Subir otro video
      </Button>
    </div>
  )

  const renderError = () => (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <AlertCircle className="size-8 text-red-600 dark:text-red-400" />
      </div>
      <div>
        <p className="font-semibold text-red-600 dark:text-red-400">
          Error al subir el video
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          No se pudo completar la subida. Intenta de nuevo.
        </p>
      </div>
      <div className="flex justify-center gap-2">
        <Button variant="outline" size="sm" onClick={reset}>
          Reintentar
        </Button>
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="sr-only"
        onChange={handleInputChange}
        disabled={disabled}
        aria-hidden
      />

      {state === 'empty' && renderDropZone()}
      {state === 'selected' && renderSelected()}
      {state === 'uploading' && renderUploading()}
      {state === 'success' && renderSuccess()}
      {state === 'error' && renderError()}
    </div>
  )
}
