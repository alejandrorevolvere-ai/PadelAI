import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const sizeMap = {
  sm: "size-4 border-2",
  md: "size-8 border-2",
  lg: "size-12 border-3",
};

export function LoadingSpinner({
  size = "md",
  className,
  label,
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label ?? "Cargando..."}
      className={cn("flex flex-col items-center justify-center gap-3", className)}
    >
      <div
        className={cn(
          "animate-spin rounded-full border-emerald-500 border-t-transparent",
          sizeMap[size]
        )}
      />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}

interface LoadingPageProps {
  className?: string;
  label?: string;
}

export function LoadingPage({ className, label }: LoadingPageProps) {
  return (
    <div
      role="status"
      aria-label={label ?? "Cargando página..."}
      className={cn(
        "flex min-h-[50vh] items-center justify-center",
        className
      )}
    >
      <LoadingSpinner size="lg" label={label ?? "Cargando..."} />
    </div>
  );
}

interface LoadingSkeletonProps {
  className?: string;
  count?: number;
}

export function LoadingCardSkeleton({
  className,
  count = 3,
}: LoadingSkeletonProps) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-6">
          <Skeleton className="mb-4 h-4 w-24" />
          <Skeleton className="mb-2 h-8 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}
