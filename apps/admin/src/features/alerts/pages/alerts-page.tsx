import { Bell } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAlerts } from "@/features/alerts/hooks";
import { useVehicles } from "@/features/vehicles/hooks";
import { formatDateTime } from "@/lib/formatters";

const SEVERITY_VARIANT = {
  info: "muted",
  warning: "warning",
  critical: "destructive",
} as const;

export function AlertsPage() {
  const { data: alerts = [], isLoading } = useAlerts();
  const { data: vehicles = [] } = useVehicles();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Alerts & Notifications" description="Maintenance, tyre, document and fuel-exception alerts." />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading alerts…</p>
      ) : alerts.length === 0 ? (
        <EmptyState icon={Bell} title="No active alerts." />
      ) : (
        <div className="flex flex-col gap-3">
          {alerts.map((alert) => {
            const vehicle = vehicles.find((v) => v.id === alert.vehicleId);
            return (
              <Card key={alert.id}>
                <CardContent className="flex items-start justify-between gap-4 p-4">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant={SEVERITY_VARIANT[alert.severity]} className="capitalize">
                        {alert.type.replace("_", " ")}
                      </Badge>
                      {vehicle && <span className="text-xs text-muted-foreground">{vehicle.registrationNumber}</span>}
                    </div>
                    <p className="text-sm">{alert.message}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(alert.createdAt)}</span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
