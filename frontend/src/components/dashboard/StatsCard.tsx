import { type LucideIcon, TrendingDown, TrendingUp } from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: "up" | "down"
  trendValue?: string
  loading?: boolean
  className?: string
}

function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  loading = false,
  className,
}: StatsCardProps) {
  if (loading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="size-8 rounded-lg" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20" />
          <Skeleton className="mt-2 h-3 w-16" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4 text-foreground" />
        </div>
      </CardHeader>

      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>

        {trend && trendValue !== undefined && (
          <div className="mt-1 flex items-center gap-1 text-xs">
            {trend === "up" ? (
              <TrendingUp className="size-3 text-emerald-500" />
            ) : (
              <TrendingDown className="size-3 text-red-500" />
            )}
            <span
              className={cn(
                "font-medium",
                trend === "up" ? "text-emerald-500" : "text-red-500"
              )}
            >
              {trendValue}
            </span>
            <span className="text-muted-foreground">vs mes anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { StatsCard }
export type { StatsCardProps }
