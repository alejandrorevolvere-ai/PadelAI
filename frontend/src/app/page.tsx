import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  MessageSquare,
  Video,
  Glasses,
  TrendingUp,
  Users,
  CheckCircle,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Chat Coach",
    description:
      "Consulta con tu entrenador IA en cualquier momento. Resuelve dudas técnicas, tácticas y de preparación física al instante.",
  },
  {
    icon: Video,
    title: "Video Analyzer",
    description:
      "Sube tus partidos y recibe análisis detallados de tu técnica, posicionamiento y toma de decisiones en la pista.",
  },
  {
    icon: Glasses,
    title: "VR Practice",
    description:
      "Entrena en realidad virtual con situaciones reales de juego. Mejora tus reflejos y anticipación sin salir de casa.",
  },
  {
    icon: TrendingUp,
    title: "Progreso",
    description:
      "Sigue tu evolución con estadísticas detalladas. Mide tu mejora session a session con métricas objetivas.",
  },
];

const stats = [
  { value: "+1000", label: "Usuarios activos" },
  { value: "+5000", label: "Análisis realizados" },
  { value: "95%", label: "Satisfacción" },
];

const plans = [
  {
    name: "Free",
    price: "0 €",
    period: "/mes",
    description: "Perfecto para empezar",
    features: [
      "Chat coach básico",
      "3 análisis de video al mes",
      "Estadísticas básicas",
    ],
    highlighted: false,
  },
  {
    name: "Pro",
    price: "9.99 €",
    period: "/mes",
    description: "Para jugadores serios",
    features: [
      "Chat coach ilimitado",
      "Análisis de video ilimitados",
      "Estadísticas avanzadas",
      "VR Practice básico",
    ],
    highlighted: true,
  },
  {
    name: "Elite",
    price: "19.99 €",
    period: "/mes",
    description: "Máximo rendimiento",
    features: [
      "Todo lo de Pro",
      "VR Practice ilimitado",
      "Plan de entrenamiento personalizado",
      "Soporte prioritario 24/7",
    ],
    highlighted: false,
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 pb-20 pt-24 sm:pt-32" aria-labelledby="hero-title">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_60%,rgba(5,150,105,0.08),transparent)]" />
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
            <Zap className="mr-1.5 size-3.5 text-emerald-500" aria-hidden="true" />
            IA entrenada con más de 10,000 partidos profesionales
          </div>
          <h1 id="hero-title" className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Tu entrenador personal de{" "}
            <span className="text-emerald-600">pádel</span> con IA
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Mejora tu juego con análisis de video impulsado por inteligencia
            artificial, entrenamiento en realidad virtual y un coach virtual
            disponible 24/7.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register">
              <Button size="lg" className="h-12 px-8 text-base">Comenzar gratis</Button>
            </Link>
            <Link href="/video">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base">Ver demo</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-muted/30 px-4 py-16" aria-label="Estadísticas de la plataforma">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-4xl font-bold text-emerald-600">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-20" aria-labelledby="features-title">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 id="features-title" className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Todo lo que necesitas para mejorar
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Herramientas impulsadas por IA diseñadas específicamente para
              jugadores de pádel de todos los niveles.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="transition-shadow hover:shadow-lg"
                >
                  <CardHeader>
                    <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-muted/30 px-4 py-20" aria-labelledby="pricing-title">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 id="pricing-title" className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Planes para cada nivel
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Empieza gratis y escala cuando estés listo para llevar tu juego al
              siguiente nivel.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative flex flex-col ${
                  plan.highlighted
                    ? "border-emerald-500 shadow-emerald-200 dark:shadow-emerald-950 ring-1 ring-emerald-500"
                    : ""
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white">
                    Más popular
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="ml-1 text-sm text-muted-foreground">
                      {plan.period}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden="true" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href="/register" className="w-full">
                    <Button
                      variant={plan.highlighted ? "default" : "outline"}
                      className="w-full"
                    >
                      {plan.name === "Free" ? "Empezar gratis" : "Suscribirse"}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-20" aria-labelledby="cta-title">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Empieza tu viaje en el pádel
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Únete a más de 1,000 jugadores que ya están mejorando su juego con
            PadelAI Coach. Sin compromiso, sin riesgos.
          </p>
          <Link href="/register">
            <Button size="lg" className="h-12 px-10 text-base">Comenzar ahora</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
