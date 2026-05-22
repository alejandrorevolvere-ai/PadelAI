import { Check, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface PricingPlan {
  name: string
  price: string
  period?: string
  description: string
  popular: boolean
  features: { text: string; included: boolean }[]
  cta: string
  ctaVariant: "default" | "outline"
}

const plans: PricingPlan[] = [
  {
    name: "Free",
    price: "€0",
    description: "Perfecto para empezar",
    popular: false,
    features: [
      { text: "Chat coach básico", included: true },
      { text: "5 análisis de video al mes", included: true },
      { text: "Estadísticas de partidos", included: true },
      { text: "VR Practice", included: false },
      { text: "Análisis biomecánico avanzado", included: false },
      { text: "Soporte prioritario", included: false },
    ],
    cta: "Comenzar gratis",
    ctaVariant: "outline",
  },
  {
    name: "Pro",
    price: "€9,99",
    period: "/mes",
    description: "Para jugadores habituales",
    popular: true,
    features: [
      { text: "Chat coach ilimitado", included: true },
      { text: "Análisis de video ilimitado", included: true },
      { text: "Estadísticas avanzadas", included: true },
      { text: "VR Practice básico", included: true },
      { text: "Análisis biomecánico avanzado", included: true },
      { text: "Soporte prioritario", included: false },
    ],
    cta: "Suscribirse",
    ctaVariant: "default",
  },
  {
    name: "Elite",
    price: "€29,99",
    period: "/mes",
    description: "La experiencia completa",
    popular: false,
    features: [
      { text: "Chat coach ilimitado", included: true },
      { text: "Análisis de video ilimitado", included: true },
      { text: "Estadísticas avanzadas", included: true },
      { text: "VR Practice completo", included: true },
      { text: "Análisis biomecánico avanzado", included: true },
      { text: "Soporte prioritario 24/7", included: true },
    ],
    cta: "Ir a Elite",
    ctaVariant: "outline",
  },
]

function PricingCard({ plan }: { plan: PricingPlan }) {
  return (
    <Card
      className={cn(
        "relative flex flex-col transition-all duration-300",
        plan.popular
          ? "scale-[1.02] border-emerald-500 shadow-xl ring-1 ring-emerald-500/20 dark:border-emerald-400 dark:ring-emerald-400/20"
          : "hover:border-muted-foreground/20"
      )}
    >
      {plan.popular && (
        <Badge className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 bg-emerald-600 px-4 py-1 text-xs font-semibold text-white shadow-lg">
          Más popular
        </Badge>
      )}

      <CardHeader>
        <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold tracking-tight text-foreground">
            {plan.price}
          </span>
          {plan.period && (
            <span className="text-sm text-muted-foreground">{plan.period}</span>
          )}
        </div>

        <ul className="space-y-3" role="list">
          {plan.features.map((feature) => (
            <li key={feature.text} className="flex items-start gap-3 text-sm">
              {feature.included ? (
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
              ) : (
                <X className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
              )}
              <span
                className={cn(
                  feature.included
                    ? "text-foreground"
                    : "text-muted-foreground/60 line-through"
                )}
              >
                {feature.text}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="border-t">
        <Button
          variant={plan.ctaVariant}
          className={cn(
            "w-full",
            plan.popular &&
              "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          )}
        >
          {plan.cta}
        </Button>
      </CardFooter>
    </Card>
  )
}

function PricingCards({ className }: { className?: string }) {
  return (
    <section className={cn("px-4 py-20 sm:px-6 sm:py-28 lg:px-8", className)}>
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Elige tu plan
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Sin compromisos. Cancela cuando quieras.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3 md:items-start">
          {plans.map((plan) => (
            <PricingCard key={plan.name} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  )
}

export { PricingCards }
