import {
  Bot,
  type LucideIcon,
  Sparkles,
  Trophy,
  Video,
} from "lucide-react"

import { cn } from "@/lib/utils"

type ActivityType = "chat" | "video" | "vr" | "achievement"

interface Activity {
  type: ActivityType
  title: string
  description: string
  time: string
}

interface ActivityFeedProps {
  activities: Activity[]
  className?: string
}

const iconMap: Record<ActivityType, LucideIcon> = {
  chat: Bot,
  video: Video,
  vr: Sparkles,
  achievement: Trophy,
}

const colorMap: Record<
  ActivityType,
  { dot: string; bg: string; text: string }
> = {
  chat: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  video: {
    dot: "bg-blue-500",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-600 dark:text-blue-400",
  },
  vr: {
    dot: "bg-purple-500",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-600 dark:text-purple-400",
  },
  achievement: {
    dot: "bg-amber-500",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-600 dark:text-amber-400",
  },
}

function ActivityItem({ activity }: { activity: Activity }) {
  const Icon = iconMap[activity.type]
  const colors = colorMap[activity.type]

  return (
    <li className="relative flex gap-4 pb-8 last:pb-0">
      {/* Línea vertical de timeline */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full",
            colors.bg,
            colors.text
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="mt-1 w-px flex-1 bg-border last:hidden" />
      </div>

      {/* Contenido de la actividad */}
      <div className="flex flex-1 flex-col gap-1 pb-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-foreground">
            {activity.title}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {activity.time}
          </span>
        </div>
        {activity.description && (
          <p className="text-sm text-muted-foreground">
            {activity.description}
          </p>
        )}
      </div>
    </li>
  )
}

function ActivityFeed({ activities, className }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-2 py-12 text-center",
          className
        )}
      >
        <Bot className="size-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          No hay actividad reciente
        </p>
      </div>
    )
  }

  return (
    <div className={cn("", className)}>
      <h3 className="mb-6 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Actividad reciente
      </h3>
      <ul className="space-y-0" role="list">
        {activities.map((activity, index) => (
          <ActivityItem
            key={`${activity.type}-${activity.title}-${index}`}
            activity={activity}
          />
        ))}
      </ul>
    </div>
  )
}

export { ActivityFeed }
export type { Activity, ActivityType, ActivityFeedProps }
