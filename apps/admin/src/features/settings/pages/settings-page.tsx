import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings, useUpdateMaintenanceThresholds } from "@/features/settings/hooks";
import { useMasterCollection } from "@/features/master-data/hooks";

const THEME_SWATCHES = [
  { label: "Primary (brass)", var: "--primary" },
  { label: "Secondary (steel)", var: "--secondary" },
  { label: "Accent (signal cyan)", var: "--accent" },
  { label: "Background (ink)", var: "--background" },
  { label: "Foreground", var: "--foreground" },
];

/** Stand-in for a wrapped row of badge chips, at assorted chip widths. */
function BadgeRowSkeleton() {
  return (
    <>
      <span className="sr-only" role="status">
        Loading…
      </span>
      {["w-20", "w-28", "w-16", "w-24", "w-32", "w-20"].map((w, i) => (
        <Skeleton key={i} className={`h-6 ${w} rounded-full`} />
      ))}
    </>
  );
}

export function SettingsPage() {
  const { data: purposes = [], isLoading: purposesLoading } = useMasterCollection("vehiclePurposes");
  const { data: departments = [], isLoading: departmentsLoading } = useMasterCollection("departmentMasters");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Administration / Configuration" description="Company-wide masters, thresholds and theme." />

      <Card>
        <CardHeader>
          <CardTitle>Active Theme</CardTitle>
          <CardDescription>
            Sourced from src/styles/themes/default.css. Ship a new look by adding a themes/&lt;name&gt;.css file with
            the same variable names — no component changes required.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          {THEME_SWATCHES.map((s) => (
            <div key={s.var} className="flex flex-col items-center gap-2">
              <div
                className="h-12 w-12 rounded-lg border border-border"
                style={{ backgroundColor: `hsl(var(${s.var}))` }}
              />
              <span className="max-w-[6rem] text-center text-xs text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurable Trip Purposes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {purposesLoading ? (
            <BadgeRowSkeleton />
          ) : (
            purposes.map((p) => (
              <Badge key={p.id} variant="outline" dot={false}>
                {p.name}
              </Badge>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {departmentsLoading ? (
            <BadgeRowSkeleton />
          ) : (
            departments.map((d) => (
              <Badge key={d.id} variant="outline" dot={false}>
                {d.name}
              </Badge>
            ))
          )}
        </CardContent>
      </Card>

      <MaintenanceThresholdsCard />
    </div>
  );
}

function MaintenanceThresholdsCard() {
  const { data: settings, isLoading } = useSettings();
  const updateThresholds = useUpdateMaintenanceThresholds();
  const [dueSoonKm, setDueSoonKm] = useState("");
  const [urgentKm, setUrgentKm] = useState("");

  useEffect(() => {
    if (!settings) return;
    setDueSoonKm(String(settings.maintenanceThresholds.dueSoonKm));
    setUrgentKm(String(settings.maintenanceThresholds.urgentKm));
  }, [settings]);

  const dueSoonValue = Number(dueSoonKm);
  const urgentValue = Number(urgentKm);
  const isValid = dueSoonKm !== "" && urgentKm !== "" && dueSoonValue > urgentValue && urgentValue >= 0;

  async function handleSave() {
    if (!isValid) {
      toast.error("Due Soon threshold must be greater than the Urgent threshold.");
      return;
    }
    try {
      await updateThresholds.mutateAsync({ dueSoonKm: dueSoonValue, urgentKm: urgentValue });
      toast.success("Maintenance alert thresholds updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update thresholds.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maintenance Alert Thresholds</CardTitle>
        <CardDescription>Remaining KM at which a vehicle's maintenance status changes on the Maintenance page.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <div aria-busy className="flex flex-col gap-4">
            <span className="sr-only" role="status">
              Loading settings…
            </span>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
            <div className="grid gap-4 sm:max-w-md sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
            <Skeleton className="h-9 w-36" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <ThresholdRow label="Normal" value={`> ${dueSoonKm || "—"} KM remaining`} />
              <ThresholdRow label="Due Soon" value={`${urgentKm || "—"}–${dueSoonKm || "—"} KM`} />
              <ThresholdRow label="Urgent" value={`< ${urgentKm || "—"} KM`} />
              <ThresholdRow label="Overdue" value="Interval exceeded" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 sm:max-w-md">
              <FormField label="Due Soon threshold (KM remaining)">
                <Input type="number" min={0} value={dueSoonKm} onChange={(e) => setDueSoonKm(e.target.value)} />
              </FormField>
              <FormField label="Urgent threshold (KM remaining)">
                <Input type="number" min={0} value={urgentKm} onChange={(e) => setUrgentKm(e.target.value)} />
              </FormField>
            </div>
            <div>
              <Button
                onClick={handleSave}
                disabled={!isValid}
                loading={updateThresholds.isPending}
                loadingText="Saving…"
              >
                Save Thresholds
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ThresholdRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">{value}</p>
    </div>
  );
}
