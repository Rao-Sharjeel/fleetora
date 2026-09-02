interface ChartTooltipProps {
  active?: boolean;
  label?: string;
  payload?: { value?: number; color?: string; name?: string }[];
  formatValue?: (value: number) => string;
}

export function ChartTooltip({ active, label, payload, formatValue = (v) => `${v}` }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-col gap-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-[2px] w-3 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="font-tabular font-semibold text-foreground">{formatValue(entry.value ?? 0)}</span>
            {entry.name && <span className="text-muted-foreground">{entry.name}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
