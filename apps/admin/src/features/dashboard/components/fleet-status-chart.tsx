import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import type { StatusCount } from "@/features/dashboard/lib/chart-data";

const BAR_TONE: Record<string, string> = {
  available: "bg-success",
  outside: "bg-secondary",
  workshop: "bg-warning",
  inactive: "bg-muted-foreground/50",
};

export function FleetStatusChart({ data }: { data: StatusCount[] }) {
  const reduceMotion = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(reduceMotion);
  const max = Math.max(1, ...data.map((d) => d.count));

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="flex h-full flex-col justify-center gap-4">
      {data.map((row) => (
        <div key={row.key} className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">{row.label}</span>
          <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-[width] ease-out",
                BAR_TONE[row.key] ?? "bg-primary",
                reduceMotion ? "duration-0" : "duration-700",
              )}
              style={{ width: mounted ? `${(row.count / max) * 100}%` : "0%" }}
            />
          </div>
          <span className="font-tabular w-5 shrink-0 text-right text-sm font-semibold text-foreground">
            {row.count}
          </span>
        </div>
      ))}
    </div>
  );
}
