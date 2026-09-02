import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { useSettings, useUpdateMaintenanceThresholds } from "@/features/settings/hooks";
import { useMasterCollection } from "@/features/master-data/hooks";

const THEME_SWATCHES = [
  { label: "Primary (brass)", var: "--primary" },
  { label: "Secondary (steel)", var: "--secondary" },
  { label: "Accent (signal cyan)", var: "--accent" },
  { label: "Background (ink)", var: "--background" },
  { label: "Foreground", var: "--foreground" },
];

export function SettingsPage() {
  const { data: purposes = [] } = useMasterCollection("vehiclePurposes");
  const { data: departments = [] } = useMasterCollection("departmentMasters");

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
          {purposes.map((p) => (
            <Badge key={p.id} variant="outline" dot={false}>
              {p.name}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {departments.map((d) => (
            <Badge key={d.id} variant="outline" dot={false}>
              {d.name}
            </Badge>
          ))}
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
    await updateThresholds.mutateAsync({ dueSoonKm: dueSoonValue, urgentKm: urgentValue });
    toast.success("Maintenance alert thresholds updated.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maintenance Alert Thresholds</CardTitle>
        <CardDescription>Remaining KM at which a vehicle's maintenance status changes on the Maintenance page.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
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
              <Button onClick={handleSave} disabled={updateThresholds.isPending || !isValid}>
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
