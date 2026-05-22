"use client";

import { useMe } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare,
  Video,
  Glasses,
  TrendingUp,
  Target,
  Clock,
  ArrowRight,
} from "lucide-react";
import { subsApi, videoApi, extractApiError } from "@/lib/api";
import type { Subscription } from "@/types";

// ─── Dashboard data ──────────────────────────────────────────────────────────

interface DashboardStats {
  videosAnalyzed: number
  conversationsCount: number
  averageScore: number | null
  currentSub: Subscription | null
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8" role="status" aria-label="Cargando panel de control...">
      <Skeleton className="mb-8 h-8 w-48" />
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

function ActivityCard({ title, date, score, type }: {
  title: string
  date: string
  score?: number | null
  type: "video" | "chat"
}) {
  return (
    <div className="flex items-center justify-between px-4 py-4 transition-colors hover:bg-muted/50">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
          {type === "video" ? (
            <Video className="size-4 text-emerald-600" aria-hidden="true" />
          ) : (
            <MessageSquare className="size-4 text-blue-600" aria-hidden="true" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{date}</p>
        </div>
      </div>
      {score != null && (
        <div className="flex items-center gap-1.5">
          <TrendingUp className="size-3.5 text-emerald-500" aria-hidden="true" />
          <span className="text-sm font-semibold text-emerald-600">
            {score}%
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const auth = useMe();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats>({
    videosAnalyzed: 0,
    conversationsCount: 0,
    averageScore: null,
    currentSub: null,
  });
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Auth guard
  useEffect(() => {
    if (!auth.isAuthenticated) {
      router.push("/login");
    }
  }, [auth.isAuthenticated, router]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!auth.isAuthenticated) return;
    setIsLoadingData(true);
    try {
      const [videosRes, subRes] = await Promise.allSettled([
        videoApi.getAnalysisHistory(),
        subsApi.getCurrentSub(),
      ]);

      const videos = videosRes.status === "fulfilled" ? videosRes.value.data : [];
      const currentSub = subRes.status === "fulfilled" ? subRes.value.data : null;

      const totalVideos = videos.length;
      const scores = videos
        .map((v: { score?: number | null }) => v.score)
        .filter((s: number | undefined | null): s is number => s != null);
      const avgScore = scores.length > 0
        ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
        : null;

      setStats({
        videosAnalyzed: totalVideos,
        conversationsCount: 0,
        averageScore: avgScore,
        currentSub,
      });

      // Build activity feed from video analysis history
      const feedItems: ActivityItem[] = videos.map((v: { title: string; created_at: string; score?: number | null }) => ({
        title: v.title,
        date: formatDate(v.created_at),
        score: v.score ?? null,
        type: "video" as const,
      }));
      setActivityFeed(feedItems);
    } catch {
      // Silently fail — UI shows zeros
    } finally {
      setIsLoadingData(false);
    }
  }, [auth.isAuthenticated]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Loading state — show skeleton while auth is loading or data is loading
  if (!auth.isAuthenticated) {
    return auth.user === null ? null : <DashboardSkeleton />;
  }

  if (isLoadingData) {
    return <DashboardSkeleton />;
  }

  const userName = auth.user?.name?.split(" ")[0] ?? "Jugador";
  const subStatus = stats.currentSub?.status ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Bienvenido, {userName}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {subStatus === "active" || subStatus === "trialing"
            ? "Plan activo — aprovecha al máximo todas las funciones."
            : "Aquí tienes un resumen de tu progreso."}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3" role="list" aria-label="Estadísticas del panel">
        <Card role="listitem">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Conversaciones
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
              <MessageSquare className="size-4" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">{stats.conversationsCount}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Con el coach IA
            </p>
          </CardContent>
        </Card>

        <Card role="listitem">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Score promedio
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
              <Target className="size-4" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">
                {stats.averageScore ?? "—"}
              </span>
              {stats.averageScore != null && (
                <span className="text-sm text-muted-foreground">/100</span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              En análisis de video
            </p>
          </CardContent>
        </Card>

        <Card role="listitem">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Videos analizados
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
              <Video className="size-4" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">{stats.videosAnalyzed}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              En total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">Acciones rápidas</h2>
        <nav className="flex flex-wrap gap-3" aria-label="Acciones rápidas">
          <Link href="/chat" aria-label="Ir al chat con el coach IA">
            <Button>
              <MessageSquare className="mr-2 size-4" aria-hidden="true" />
              Chat Coach
            </Button>
          </Link>
          <Link href="/video/subir" aria-label="Subir un nuevo video para analizar">
            <Button variant="secondary">
              <Video className="mr-2 size-4" aria-hidden="true" />
              Subir Video
            </Button>
          </Link>
          <Link href="/vr" aria-label="Ir a entrenamiento en realidad virtual">
            <Button variant="outline">
              <Glasses className="mr-2 size-4" aria-hidden="true" />
              VR Practice
            </Button>
          </Link>
        </nav>
      </div>

      {/* Recent Feedback */}
      <section aria-labelledby="recent-feedback-title">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="recent-feedback-title" className="text-lg font-semibold">Últimos feedbacks</h2>
          <Link href="/feedbacks" aria-label="Ver todos los feedbacks">
            <Button variant="ghost" size="sm">
              Ver todos
              <ArrowRight className="ml-1 size-3" aria-hidden="true" />
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {activityFeed.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Aún no tienes análisis. Sube tu primer video para recibir feedback.
                </div>
              ) : (
                activityFeed.slice(0, 5).map((item, idx) => (
                  <ActivityCard
                    key={`${item.title}-${idx}`}
                    title={item.title}
                    date={item.date}
                    score={item.score}
                    type={item.type}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface ActivityItem {
  title: string
  date: string
  score: number | null
  type: "video" | "chat"
}

function formatDate(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMs = now - then
  const diffSeconds = Math.floor(diffMs / 1000)

  if (diffSeconds < 60) return "ahora"
  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `hace ${diffMinutes} min`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `hace ${diffHours} h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `hace ${diffDays} días`
  const diffWeeks = Math.floor(diffDays / 7)
  return `hace ${diffWeeks} sem`
}
