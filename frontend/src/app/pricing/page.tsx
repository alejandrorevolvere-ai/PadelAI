"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Check,
  X,
  HelpCircle,
  ChevronDown,
  Loader2,
  Sparkles,
  AlertCircle,
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
import { subsApi } from "@/lib/api"
import { toast } from "sonner"

// ─── Types ──────────────────────────────────────────────────────────────────

interface PricingPlan {
  id: string
  name: string
  monthlyPrice: number
  annualPrice: number
  description: string
  popular: boolean
  features: { text: string; included: boolean }[]
  cta: string
  ctaVariant: "default" | "outline"
  badge?: string
}

// ─── Data ───────────────────────────────────────────────────────────────────

const plans: PricingPlan[] = [
  {
    id: "free",
    name: "Gratuito",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Perfecto para empezar",
    popular: false,
    features: [
      { text: "Chat coach básico", included: true },
      { text: "3 análisis de vídeo al mes", included: true },
      { text: "Estadísticas básicas", included: true },
      { text: "VR Practice", included: false },
      { text: "Análisis biomecánico avanzado", included: false },
      { text: "Soporte prioritario", included: false },
    ],
    cta: "Comenzar gratis",
    ctaVariant: "outline",
    badge: "Ya tienes cuenta",
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 9.99,
    annualPrice: 7.99,
    description: "Para jugadores habituales",
    popular: true,
    features: [
      { text: "Chat coach ilimitado", included: true },
      { text: "Análisis de vídeo ilimitado", included: true },
      { text: "Estadísticas avanzadas", included: true },
      { text: "VR Practice básico", included: true },
      { text: "Análisis biomecánico avanzado", included: true },
      { text: "Soporte prioritario", included: false },
    ],
    cta: "Suscribirse",
    ctaVariant: "default",
  },
  {
    id: "elite",
    name: "Elite",
    monthlyPrice: 29.99,
    annualPrice: 24.99,
    description: "La experiencia completa",
    popular: false,
    features: [
      { text: "Chat coach ilimitado", included: true },
      { text: "Análisis de vídeo ilimitado", included: true },
      { text: "Estadísticas avanzadas", included: true },
      { text: "VR Practice completo", included: true },
      { text: "Análisis biomecánico avanzado", included: true },
      { text: "Soporte prioritario 24/7", included: true },
    ],
    cta: "Ir a Elite",
    ctaVariant: "outline",
  },
]

const faqs = [
  {
    question: "¿Puedo cambiar de plan?",
    answer:
      "Sí, puedes cambiar de plan en cualquier momento. Si actualizas a un plan superior, pagarás la diferencia prorrateada del mes en curso. Si cambias a un plan inferior, el nuevo precio se aplicará al siguiente ciclo de facturación.",
  },
  {
    question: "¿Qué pasa si cancelo mi suscripción?",
    answer:
      "Si cancelas, seguirás teniendo acceso a las funciones de tu plan hasta el final del período de facturación actual. Después, tu cuenta pasará automáticamente al plan gratuito sin perder tus datos ni estadísticas.",
  },
  {
    question: "¿Tengo periodo de prueba gratuito?",
    answer:
      "Sí, todos los planes de pago incluyen 7 días de prueba gratuita. No te cobraremos hasta que termine el periodo de prueba y puedes cancelar en cualquier momento sin ningún cargo.",
  },
  {
    question: "¿Puedo usar VR Practice con el plan Gratuito?",
    answer:
      "El plan Gratuito no incluye VR Practice. Necesitas el plan Pro o superior para acceder al entrenamiento en realidad virtual. Consulta la tabla de comparativa para más detalles.",
  },
  {
    question: "¿Cómo funciona el pago?",
    answer:
      "Aceptamos tarjetas de crédito/débito y PayPal. Todos los pagos se procesan de forma segura a través de Stripe. Tus datos de pago nunca se almacenan en nuestros servidores.",
  },
]

// ─── FAQ Accordion ──────────────────────────────────────────────────────────

function FAQItem({
  question,
  answer,
  open,
  onToggle,
}: {
  question: string
  answer: string
  open: boolean
  onToggle: () => void
}) {
  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-0 py-5 text-left text-sm font-medium transition-colors hover:text-emerald-600"
      >
        <span className="flex items-start gap-3">
          <HelpCircle className="mt-0.5 size-4 shrink-0 text-emerald-500" />
          <span>{question}</span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          open ? "max-h-48 pb-5" : "max-h-0"
        )}
      >
        <p className="pl-7 text-sm leading-relaxed text-muted-foreground">
          {answer}
        </p>
      </div>
    </div>
  )
}

// ─── Pricing Card ───────────────────────────────────────────────────────────

function PricingCard({
  plan,
  annual,
  onCheckout,
  loading,
}: {
  plan: PricingPlan
  annual: boolean
  onCheckout: (planId: string) => void
  loading: boolean
}) {
  const price = annual ? plan.annualPrice : plan.monthlyPrice
  const periodLabel = annual ? "/mes, facturado anual" : "/mes"

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

      {plan.badge && (
        <Badge
          variant="outline"
          className="absolute right-3 top-3 border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400"
        >
          {plan.badge}
        </Badge>
      )}

      <CardHeader>
        <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold tracking-tight text-foreground">
            {price === 0 ? "Gratis" : `${price.toFixed(2).replace(".", ",")} €`}
          </span>
          {price > 0 && (
            <span className="text-sm text-muted-foreground">
              {periodLabel}
            </span>
          )}
        </div>

        {annual && price > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
            <Sparkles className="size-3.5" />
            Ahorras{" "}
            {((plan.monthlyPrice - plan.annualPrice) * 12)
              .toFixed(2)
              .replace(".", ",")}{" "}
            € al año
          </div>
        )}

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
          onClick={() => onCheckout(plan.id)}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Procesando...
            </>
          ) : (
            plan.cta
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function PricingPage() {
  const [annual, setAnnual] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const handleCheckout = async (planId: string) => {
    if (planId === "free") {
      // Free plan: just navigate to register
      window.location.href = "/register"
      return
    }

    setLoadingId(planId)
    setError(null)

    try {
      const response = await subsApi.createCheckoutSession(planId)
      const { url } = response.data

      if (url) {
        window.location.href = url
      } else {
        throw new Error("No se recibió URL de checkout")
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error al procesar el pago. Intenta de nuevo."
      setError(message)
      toast.error("Error de pago", {
        description: message,
      })
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="flex flex-col">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pb-20 pt-24 sm:pt-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_60%,rgba(5,150,105,0.08),transparent)]" />
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
            <Sparkles className="mr-1.5 size-3.5 text-emerald-500" />
            Sin compromisos. Cancela cuando quieras.
          </div>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Elige tu{" "}
            <span className="text-emerald-600">plan</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
    Empieza gratis y actualiza cuando necesites más. Todos los planes incluyen
            7 días de prueba gratuita.
          </p>

          {/* Toggle Monthly / Annual */}
          <div className="mx-auto flex w-fit items-center gap-3 rounded-full border bg-muted/50 p-1">
            <button
              onClick={() => setAnnual(false)}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-medium transition-all",
                !annual
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Mensual
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn(
                "relative rounded-full px-5 py-2 text-sm font-medium transition-all",
                annual
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Anual
              <span className="ml-1.5 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                Ahorra 20%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Plans Grid ───────────────────────────────────────────────────── */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-6xl">
          {/* Error message */}
          {error && (
            <div className="mx-auto mb-8 flex max-w-lg items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
                aria-label="Cerrar"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          <div className="grid gap-8 md:grid-cols-3 md:items-start">
            {plans.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                annual={annual}
                onCheckout={handleCheckout}
                loading={loadingId === plan.id}
              />
            ))}
          </div>

          {/* Highlight for free plan users */}
          <Card className="mx-auto mt-10 max-w-2xl border-dashed border-emerald-500/50 bg-emerald-50/50 text-center dark:bg-emerald-950/20">
            <CardHeader>
              <CardTitle className="text-base">
                ¿Ya tienes una cuenta gratuita?
              </CardTitle>
              <CardDescription>
                Puedes actualizar a Pro o Elite en cualquier momento desde tu
                panel de control. Todos tus datos y progreso se conservan.
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center border-t-0 pt-0">
              <Link href="/dashboard">
                <Button variant="outline">Ir a mi cuenta</Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="bg-muted/30 px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Preguntas frecuentes
            </h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              Resolvemos tus dudas sobre planes, pagos y suscripciones.
            </p>
          </div>

          <Card className="border-0 bg-transparent shadow-none">
            <CardContent className="p-0">
              {faqs.map((faq, i) => (
                <FAQItem
                  key={i}
                  question={faq.question}
                  answer={faq.answer}
                  open={openFaq === i}
                  onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                />
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Empieza gratis, actualiza cuando quieras
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Sin ataduras. Disfruta del plan gratuito todo el tiempo que
            necesites y da el salto cuando estés listo para más.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              className="h-12 px-10 text-base"
              onClick={() => handleCheckout("free")}
            >
              Empezar gratis
            </Button>
            <Link href="/vr">
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-8 text-base"
              >
                Ver VR Practice
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
