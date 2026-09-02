import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyPoint } from "@/features/dashboard/lib/chart-data";
import { ChartTooltip } from "@/components/shared/chart-tooltip";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { formatCurrency } from "@/lib/formatters";

export function FuelSpendChart({ data }: { data: DailyPoint[] }) {
  const { bar, grid, tick } = useThemeColors({ bar: "secondary", grid: "border", tick: "muted-foreground" });
  const reduceMotion = usePrefersReducedMotion();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
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
        <Tooltip cursor={{ fill: bar, fillOpacity: 0.08 }} content={<ChartTooltip formatValue={formatCurrency} />} />
        <Bar
          dataKey="fuelCost"
          name="Fuel spend"
          fill={bar}
          radius={[4, 4, 0, 0]}
          maxBarSize={22}
          isAnimationActive={!reduceMotion}
          animationDuration={700}
          animationEasing="ease-out"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
