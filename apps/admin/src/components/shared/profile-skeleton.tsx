import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileSkeletonProps {
  /** Number of tab triggers on the real page, so the tab strip lines up. */
  tabs?: number;
  /** Draws a round avatar in the header (Driver/Guard) rather than none. */
  avatar?: boolean;
}

/** Placeholder for the Driver/Guard/Vehicle profile pages — header, tab strip
 * and the Overview card grid, in the same shape the loaded page uses. */
export function ProfileSkeleton({ tabs = 4, avatar = true }: ProfileSkeletonProps) {
  return (
    <div aria-busy className="flex flex-col gap-6">
      <span className="sr-only" role="status">
        Loading…
      </span>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {avatar && <Skeleton className="h-12 w-12 rounded-full" />}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      <div className="flex gap-2">
        {Array.from({ length: tabs }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24" />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex flex-col gap-3 p-4">
              <Skeleton className="h-4 w-28" />
              {Array.from({ length: 3 }).map((_, line) => (
                <div key={line} className="flex items-center justify-between gap-4">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
