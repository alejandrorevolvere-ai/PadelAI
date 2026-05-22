"use client"

import { useState, lazy, Suspense } from "react"
import Link from "next/link"
import {
  Monitor,
  Bot,
  ListChecks,
  Play,
  Glasses,
  MousePointer2,
  Keyboard,
  CheckCircle2,
  X,
  Sparkles,
  Trophy,
  Headphones,
  Gamepad2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { LoadingSpinner } from "@/components/ui/loading"

// ─── Dynamic imports for heavy Three.js components ────────────────────────────

const VRScene = lazy(() => import("@/components/vr/VRScene"))
const VRModeSelector = lazy(() => import("@/components/vr/VRModeSelector"))

function VRSectionFallback() {
  return (
    <div className="flex aspect-video items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-900 via-teal-800 to-blue-900 shadow-2xl">
      <LoadingSpinner size="lg" label="Cargando escena 3D..." />
    </div>
  )
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface VRMode {
  id: string
  title: string
  description: string
  icon: typeof Monitor
  difficulty: "Principiante" | "Intermedio" | "Avanzado"
  status: "disponible" | "proximamente"
}

interface DifficultyOption {
  id: string
  label: string
  description: string
}

// ─── Data ───────────────────────────────────────────────────────────────────

const vrModes: VRMode[] = [
  {
    id: "pared",
    title: "Pared automática",
    description:
      "Golpea la pelota contra la pared una y otra vez. Perfecto para mejorar reflejos, control de pala y consistencia en el golpeo.",
    icon: Monitor,
    difficulty: "Principiante",
    status: "disponible",
  },
  {
    id: "rival-ia",
    title: "Rival IA",
    description:
      "Enfréntate a una inteligencia artificial que simula estilos de juego reales. Se adapta a tu nivel y corrige tus errores.",
    icon: Bot,
    difficulty: "Intermedio",
    status: "proximamente",
  },
  {
    id: "drills",
    title: "Drills guiados",
    description:
      "Sesiones estructuradas de entrenamiento con ejercicios progresivos diseñados por entrenadores profesionales.",
    icon: ListChecks,
    difficulty: "Avanzado",
    status: "proximamente",
  },
  {
    id: "freeplay",
    title: "Free play",
    description:
      "Modo libre sin restricciones. Juega a tu ritmo, experimenta golpes nuevos y disfruta de la pista virtual sin límites.",
    icon: Play,
    difficulty: "Intermedio",
    status: "disponible",
  },
]

const difficulties: DifficultyOption[] = [
  {
    id: "facil",
    label: "Fácil",
    description: "Ritmo lento, margen amplio",
  },
  {
    id: "medio",
    label: "Medio",
    description: "Ritmo moderado, precisión media",
  },
  {
    id: "dificil",
    label: "Difícil",
    description: "Ritmo rápido, precisión alta",
  },
]

const requirements = [
  { icon: Glasses, label: "WebXR compatible" },
  { icon: Trophy, label: "Quest 2 / Quest 3" },
  { icon: Headphones, label: "Chrome (última versión)" },
  { icon: Gamepad2, label: "Mandos VR + espacio 2×2m" },
]

const difficultyColors: Record<string, string> = {
  Principiante: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400",
  Intermedio: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400",
  Avanzado: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400",
}

// ─── Modal Component ────────────────────────────────────────────────────────

function StartModal({
  open,
  onClose,
  onStart,
}: {
  open: boolean
  onClose: () => void
  onStart: (mode: string, difficulty: string) => void
}) {
  const [selectedMode, setSelectedMode] = useState<string | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(
    null
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Iniciar sesión VR"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Modal */}
      <div className="relative z-10 mx-4 w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Iniciar sesión VR</h3>
            <p className="text-sm text-muted-foreground">
              Selecciona modo y dificultad
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </Button>
        </div>

        {/* Modo */}
        <div className="mb-5">
          <label className="mb-2 block text-sm font-medium">Modo</label>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Seleccionar modo VR">
            {vrModes.map((mode) => {
              const Icon = mode.icon
              const isAvailable = mode.status === "disponible"
              return (
                <button
                  key={mode.id}
                  onClick={() => isAvailable && setSelectedMode(mode.id)}
                  disabled={!isAvailable}
                  role="radio"
                  aria-checked={selectedMode === mode.id}
                  aria-label={`${mode.title}${!isAvailable ? ' — Próximamente' : ''}`}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-xs transition-all",
                    selectedMode === mode.id
                      ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20 dark:bg-emerald-950/50"
                      : "border-border hover:border-muted-foreground/30",
                    !isAvailable && "cursor-not-allowed opacity-40"
                  )}
                >
                  <Icon className="size-5 text-emerald-600" aria-hidden="true" />
                  <span className="font-medium">{mode.title}</span>
                  {!isAvailable && (
                    <Badge variant="secondary" className="text-[10px]">
                      Próximamente
                    </Badge>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Dificultad */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium">Dificultad</label>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Seleccionar dificultad">
            {difficulties.map((diff) => (
              <button
                key={diff.id}
                onClick={() => setSelectedDifficulty(diff.id)}
                role="radio"
                aria-checked={selectedDifficulty === diff.id}
                aria-label={`Dificultad ${diff.label}`}
                className={cn(
                  "rounded-xl border p-2.5 text-center text-xs transition-all",
                  selectedDifficulty === diff.id
                    ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20 dark:bg-emerald-950/50"
                    : "border-border hover:border-muted-foreground/30"
                )}
              >
                <span className="block text-sm font-medium">{diff.label}</span>
                <span className="mt-0.5 block text-muted-foreground">
                  {diff.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        <Button
          className="w-full"
          size="lg"
          disabled={!selectedMode || !selectedDifficulty}
          onClick={() => {
            if (selectedMode && selectedDifficulty) {
              onStart(selectedMode, selectedDifficulty)
              onClose()
            }
          }}
        >
          <Glasses className="mr-2 size-5" aria-hidden="true" />
          Iniciar sesión VR
        </Button>
      </div>
    </div>
  )
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function VRPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [sceneActive, setSceneActive] = useState(false)
  const [sceneMode, setSceneMode] = useState<string>("pared")

  return (
    <div className="flex flex-col">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden px-4 pb-20 pt-24 sm:pt-32"
        aria-labelledby="vr-hero-title"
      >
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_60%,rgba(5,150,105,0.08),transparent)]" />
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
            <Sparkles className="mr-1.5 size-3.5 text-emerald-500" aria-hidden="true" />
            Realidad virtual para pádel
          </div>
          {/* ⚠️ Disclaimer: esto NO es VR real */}
          <div className="mx-auto mb-8 max-w-2xl rounded-xl border-2 border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-800 dark:border-amber-800/30 dark:bg-amber-950/30 dark:text-amber-300">
            <strong className="block mb-1">🔶 Demo 3D interactiva</strong>
            Esta sección es una <strong>simulación 3D navegable con ratón</strong>, no realidad virtual real. 
            Para VR auténtico (WebXR + cascos) se necesita desarrollo adicional. 
            Los modos "Pared automática" y "Free play" son visualizaciones interactivas.
          </div>
          <h1 id="vr-hero-title" className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Practica pádel{" "}
            <span className="text-emerald-600">sin pista</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Entrena en cualquier lugar con realidad virtual. Mejora tus reflejos,
            anticipación y técnica sin necesidad de una pista real. Simula
            situaciones de juego realistas desde tu salón.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              className="h-12 px-8 text-base"
              onClick={() => setModalOpen(true)}
              aria-label="Probar entrenamiento VR ahora"
            >
              <Glasses className="mr-2 size-5" aria-hidden="true" />
              Probar ahora
            </Button>
            <Link href="/pricing">
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-8 text-base"
              >
                Ver planes
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── VR Modes Grid ────────────────────────────────────────────────── */}
      <section className="px-4 py-20" aria-labelledby="vr-modes-title">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 id="vr-modes-title" className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Modos de entrenamiento VR
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Elige el modo que mejor se adapte a tu objetivo de entrenamiento.
              Todos los modos ofrecen feedback en tiempo real.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {vrModes.map((mode) => {
              const Icon = mode.icon
              const isAvailable = mode.status === "disponible"
              return (
                <Card
                  key={mode.id}
                  className={cn(
                    "relative flex flex-col transition-all duration-300 hover:shadow-lg",
                    !isAvailable && "opacity-75"
                  )}
                >
                  {!isAvailable && (
                    <Badge
                      variant="secondary"
                      className="absolute right-3 top-3"
                    >
                      Próximamente
                    </Badge>
                  )}
                  {isAvailable && (
                    <Badge className="absolute right-3 top-3 bg-emerald-600">
                      Beta
                    </Badge>
                  )}
                  <CardHeader>
                    <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <CardTitle className="text-lg">{mode.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {mode.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        difficultyColors[mode.difficulty]
                      )}
                    >
                      {mode.difficulty}
                    </span>
                  </CardContent>
                  <CardFooter>
                    {isAvailable ? (
                      <Button
                        className="w-full"
                        onClick={() => setModalOpen(true)}
                      >
                        <Play className="mr-2 size-4" aria-hidden="true" />
                        Jugar ahora
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" disabled>
                        Próximamente
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Cómo funciona ────────────────────────────────────────────────── */}
      <section className="bg-muted/30 px-4 py-20" aria-labelledby="how-it-works-title">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 id="how-it-works-title" className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Cómo funciona
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Tres pasos para empezar a entrenar en realidad virtual.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: 1,
                icon: Glasses,
                title: "Ponte las gafas VR",
                description:
                  "Conecta tus gafas de realidad virtual compatibles y accede a la práctica desde el navegador.",
              },
              {
                step: 2,
                icon: Gamepad2,
                title: "Sujeta los mandos",
                description:
                  "Toma los mandos VR. La IA reconoce tus movimientos para simular los golpes de pádel en tiempo real.",
              },
              {
                step: 3,
                icon: Trophy,
                title: "Juega y mejora",
                description:
                  "Empieza a entrenar. Recibe feedback inmediato sobre cada golpe y sigue tu progreso sesión a sesión.",
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.step}
                  className="relative flex flex-col items-center text-center"
                >
                  {/* Step number */}
                  <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                    {item.step}
                  </div>
                  {/* Connector line (desktop) */}
                  {item.step < 3 && (
                    <div className="absolute top-7 left-[60%] hidden h-0.5 w-[calc(80%)] bg-gradient-to-r from-emerald-300 to-transparent md:block" aria-hidden="true" />
                  )}
                  <Icon className="mb-3 size-8 text-emerald-600" aria-hidden="true" />
                  <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                  <p className="max-w-xs text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── 3D Scene ──────────────────────────────────────────────────────── */}
      <section className="px-4 py-20" aria-labelledby="simulation-title">
        <div className="mx-auto max-w-5xl">
          {sceneActive ? (
            <>
              <div className="mb-4 text-center">
                <h2 id="simulation-title" className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
                  Simulación 3D
                </h2>
                <p className="mx-auto max-w-2xl text-muted-foreground">
                  Así se ve la pista virtual desde dentro. Usa el ratón para
                  rotar y hacer zoom.
                </p>
              </div>
              <div className="relative aspect-video overflow-hidden rounded-2xl shadow-2xl">
                <Suspense fallback={<VRSectionFallback />}>
                  <VRScene mode={sceneMode} />
                </Suspense>
                <Suspense fallback={null}>
                  <VRModeSelector
                    currentMode={sceneMode}
                    onModeChange={setSceneMode}
                    modes={vrModes.map((m) => ({
                      id: m.id,
                      title: m.title,
                      description: m.description,
                      icon: m.icon,
                      difficulty: m.difficulty,
                    }))}
                  />
                </Suspense>
              </div>
            </>
          ) : (
            <>
              <div className="mb-8 text-center">
                <h2 id="simulation-title" className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
                  Simulación 3D
                </h2>
                <p className="mx-auto max-w-2xl text-muted-foreground">
                  Así se ve la pista virtual desde dentro. Una experiencia inmersiva
                  diseñada para que sientas cada golpe.
                </p>
              </div>

              <div className="relative aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900 via-teal-800 to-blue-900 shadow-2xl">
                {/* Grid lines for depth effect */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:40px_40px]" aria-hidden="true" />
                {/* Court glow */}
                <div className="absolute bottom-0 left-1/2 h-1/2 w-3/4 -translate-x-1/2 bg-[radial-gradient(ellipse_at_bottom,rgba(5,150,105,0.15),transparent_70%)]" aria-hidden="true" />
                {/* Content */}
                <div className="relative flex h-full flex-col items-center justify-center gap-4">
                  <Glasses className="size-16 text-emerald-400/80" aria-hidden="true" />
                  <p className="text-2xl font-bold text-white/90">
                    Simulación 3D
                  </p>
                  <p className="text-sm text-white/60">
                    Pista virtual de pádel con IA integrada
                  </p>
                  <div className="mt-2 flex items-center gap-6 text-xs text-white/40">
                    <span>60 FPS</span>
                    <span className="size-1 rounded-full bg-white/40" aria-hidden="true" />
                    <span>4K por ojo</span>
                    <span className="size-1 rounded-full bg-white/40" aria-hidden="true" />
                    <span>Latencia &lt;20ms</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Technical Requirements ────────────────────────────────────────── */}
      <section className="bg-muted/30 px-4 py-20" aria-labelledby="requirements-title">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 id="requirements-title" className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Requisitos técnicos
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Para disfrutar de la experiencia VR completa necesitas:
            </p>
          </div>

          <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {requirements.map((req) => {
              const Icon = req.icon
              return (
                <div
                  key={req.label}
                  className="flex items-center gap-3 rounded-xl border bg-card p-4"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{req.label}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop fallback */}
          <Card className="border-dashed border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                  <MousePointer2 className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    ¿No tienes gafas VR?
                  </CardTitle>
                  <CardDescription>
                    También puedes practicar desde el escritorio con ratón y
                    teclado. Funcionalidad reducida pero ideal para empezar.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardFooter>
              <Button variant="outline" className="gap-2">
                <Keyboard className="size-4" aria-hidden="true" />
                Probar versión escritorio
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Lleva tu entrenamiento al siguiente nivel
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Ya sea en VR o desde tu ordenador, PadelAI Coach te ayuda a mejorar
            cada día. Sin pista, sin excusas.
          </p>
          <Button
            size="lg"
            className="h-12 px-10 text-base"
            onClick={() => setModalOpen(true)}
            aria-label="Probar entrenamiento VR ahora"
          >
            <Glasses className="mr-2 size-5" aria-hidden="true" />
            Probar ahora
          </Button>
        </div>
      </section>

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      <StartModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onStart={(mode, _difficulty) => {
          setSceneMode(mode)
          setSceneActive(true)
        }}
      />
    </div>
  )
}
