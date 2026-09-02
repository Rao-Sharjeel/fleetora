import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyPoint } from "@/features/dashboard/lib/chart-data";
import { ChartTooltip } from "@/components/shared/chart-tooltip";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";

export function ActivityTrendChart({ data }: { data: DailyPoint[] }) {
  const { line, grid, tick, surface } = useThemeColors({
    line: "primary",
    grid: "border",
    tick: "muted-foreground",
    surface: "card",
  });
  const reduceMotion = usePrefersReducedMotion();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={line} stopOpacity={0.22} />
            <stop offset="100%" stopColor={line} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={grid} strokeOpacity={0.6} vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: tick, fontSize: 11 }}
          interval={1}
          dy={6}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: tick, fontSize: 11 }}
          width={40}
          tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : `${v}`)}
        />
        <Tooltip
          cursor={{ stroke: line, strokeOpacity: 0.3, strokeWidth: 1 }}
          content={<ChartTooltip formatValue={(v) => `${v.toLocaleString()} km`} />}
        />
        <Area
          type="monotone"
          dataKey="km"
          name="Distance"
          stroke={line}
          strokeWidth={2}
          fill="url(#activityFill)"
          activeDot={{ r: 5, strokeWidth: 2, stroke: surface, fill: line }}
          dot={false}
          isAnimationActive={!reduceMotion}
          animationDuration={900}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
