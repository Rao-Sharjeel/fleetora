import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: { direction: "up" | "down"; label: string };
  tone?: "default" | "success" | "warning" | "destructive";
  onClick?: () => void;
}

const TONE_CLASSES: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "bg-secondary/10 text-secondary ring-secondary/25",
  success: "bg-success/10 text-success ring-success/25",
  warning: "bg-warning/10 text-warning ring-warning/25",
  destructive: "bg-destructive/10 text-destructive ring-destructive/25",
};

const TONE_BAR: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "bg-secondary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

export function KpiCard({ label, value, icon: Icon, trend, tone = "default", onClick }: KpiCardProps) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden",
        onClick && "cursor-pointer transition-transform duration-150 hover:-translate-y-0.5 hover:border-foreground/15",
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === "Enter" || e.key === " ") && onClick() : undefined}
    >
      <span className={cn("absolute inset-y-0 left-0 w-[3px]", TONE_BAR[tone])} aria-hidden />
      <CardContent className="flex items-start justify-between gap-3 p-4 pl-5">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="truncate text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <span className="font-tabular truncate text-2xl font-semibold leading-none tracking-tight text-foreground">
            {value}
          </span>
          {trend && (
            <span
              className={cn(
                "text-xs font-medium",
                trend.direction === "up" ? "text-success" : "text-destructive",
              )}
            >
              {trend.direction === "up" ? "▲" : "▼"} {trend.label}
            </span>
          )}
        </div>
        {Icon && (
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1", TONE_CLASSES[tone])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
