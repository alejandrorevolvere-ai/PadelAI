import { cn } from "@/lib/utils"

interface Feature {
  icon: string
  title: string
  description: string
  color: "emerald" | "blue" | "purple" | "amber"
}

const features: Feature[] = [
  {
    icon: "💬",
    title: "Chat Coach",
    description: "Entrenador IA especializado en pádel",
    color: "emerald",
  },
  {
    icon: "📹",
    title: "Video Analyzer",
    description: "Análisis biomecánico de tus golpes",
    color: "blue",
  },
  {
    icon: "🥽",
    title: "VR Practice",
    description: "Practica sin pista con realidad virtual",
    color: "purple",
  },
  {
    icon: "📊",
    title: "Progreso",
    description: "Seguimiento detallado de tu evolución",
    color: "amber",
  },
]

const colorMap: Record<
  Feature["color"],
  { border: string; hover: string; badge: string }
> = {
  emerald: {
    border: "border-emerald-200 dark:border-emerald-800",
    hover:
      "hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-emerald-500/10",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  blue: {
    border: "border-blue-200 dark:border-blue-800",
    hover:
      "hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-blue-500/10",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  purple: {
    border: "border-purple-200 dark:border-purple-800",
    hover:
      "hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-purple-500/10",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  },
  amber: {
    border: "border-amber-200 dark:border-amber-800",
    hover:
      "hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-amber-500/10",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
}

function FeatureCard({ feature }: { feature: Feature }) {
  const colors = colorMap[feature.color]

  return (
    <div
      className={cn(
        "group flex flex-col gap-4 rounded-2xl border-2 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
        colors.border,
        colors.hover
      )}
    >
      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-xl text-xl",
          colors.badge
        )}
      >
        {feature.icon}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
      </div>
    </div>
  )
}

function Features({ className }: { className?: string }) {
  return (
    <section className={cn("px-4 py-20 sm:px-6 sm:py-28 lg:px-8", className)}>
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Todo lo que necesitas para mejorar
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Herramientas diseñadas específicamente para jugadores de pádel de
            todos los niveles
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  )
}

export { Features }
