import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface CardGridSkeletonProps {
  /** How many placeholder cards to draw — roughly a screenful. */
  count?: number;
  /** "grid" matches the 3-up card pages; "stack" the full-width list pages. */
  layout?: "grid" | "stack";
  /** Body lines under the card's title row. */
  lines?: number;
}

/** Placeholder for the card-list screens (Alerts, Maintenance, Vehicles
 * Outside) — the ones that render cards rather than a DataTable. */
export function CardGridSkeleton({ count = 6, layout = "grid", lines = 2 }: CardGridSkeletonProps) {
  return (
    <div
      aria-busy
      className={cn(
        layout === "grid" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-3",
      )}
    >
      <span className="sr-only" role="status">
        Loading…
      </span>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            {Array.from({ length: lines }).map((_, line) => (
              // Last line runs short, the way a wrapped paragraph does.
              <Skeleton key={line} className={cn("h-3", line === lines - 1 ? "w-1/2" : "w-full")} />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
