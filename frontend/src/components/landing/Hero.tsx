import { ArrowRight, Play } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function Hero({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-700 px-4 py-20 sm:px-6 sm:py-28 lg:px-8",
        className
      )}
    >
      {/* Patrón decorativo de fondo */}
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 25% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 75% 30%, rgba(255,255,255,0.2) 0%, transparent 50%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-12 lg:flex-row lg:gap-16">
        {/* Columna de texto */}
        <div className="flex flex-1 flex-col items-center text-center lg:items-start lg:text-left">
          <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Tu entrenador personal de pádel
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-emerald-50 sm:text-xl">
            Analiza tus partidos con IA, mejora tu técnica con video, practica en
            VR
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Button
              size="lg"
              className="gap-2 rounded-full bg-white px-8 text-emerald-700 shadow-lg hover:bg-emerald-50 hover:text-emerald-800"
            >
              Comenzar gratis
              <ArrowRight className="size-4" />
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="gap-2 rounded-full border-white/40 px-8 text-white hover:bg-white/10 hover:text-white"
            >
              <Play className="size-4" />
              Ver cómo funciona
            </Button>
          </div>
        </div>

        {/* Columna del mockup visual */}
        <div className="flex flex-1 justify-center lg:justify-end">
          <div className="relative w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-2 shadow-2xl backdrop-blur-sm">
            <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 p-6">
              <div className="flex flex-col items-center gap-4">
                {/* Ilustración simplificada de análisis de swing */}
                <div className="relative flex h-32 w-full items-center justify-center">
                  {/* Silueta de jugador */}
                  <svg
                    viewBox="0 0 120 120"
                    className="h-full text-white/80"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Cabeza */}
                    <circle cx="60" cy="20" r="10" fill="currentColor" />
                    {/* Cuerpo */}
                    <rect x="55" y="30" width="10" height="25" rx="3" fill="currentColor" />
                    {/* Brazo con pala */}
                    <path
                      d="M65 38 L85 22 L95 28 L80 44 Z"
                      fill="currentColor"
                      opacity="0.9"
                    />
                    {/* Pala */}
                    <ellipse cx="98" cy="24" rx="8" ry="15" transform="rotate(-30 98 24)" fill="currentColor" opacity="0.7" />
                    {/* Piernas */}
                    <line x1="58" y1="55" x2="50" y2="80" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                    <line x1="62" y1="55" x2="72" y2="80" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                    {/* Línea de trayectoria punteada */}
                    <path
                      d="M100 20 Q115 10 110 30 Q105 50 95 45"
                      stroke="rgba(255,255,255,0.4)"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                      fill="none"
                    />
                  </svg>
                </div>

                <div className="flex items-center gap-2 text-sm text-emerald-100">
                  <div className="size-2 animate-pulse rounded-full bg-emerald-400" />
                  Analizando swing...
                </div>

                {/* Mini estadísticas */}
                <div className="flex w-full gap-3">
                  <div className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-center">
                    <span className="block text-xs text-emerald-200">Velocidad</span>
                    <span className="text-sm font-bold text-white">64 km/h</span>
                  </div>
                  <div className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-center">
                    <span className="block text-xs text-emerald-200">Ángulo</span>
                    <span className="text-sm font-bold text-white">32°</span>
                  </div>
                  <div className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-center">
                    <span className="block text-xs text-emerald-200">Efecto</span>
                    <span className="text-sm font-bold text-white">1800 rpm</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export { Hero }
