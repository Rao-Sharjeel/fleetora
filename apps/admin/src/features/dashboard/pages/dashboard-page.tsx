import { useMemo } from "react";
import { Truck, Warehouse, MapPinned, Route, Fuel, Wrench, CircleDot, FileWarning } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useVehicles } from "@/features/vehicles/hooks";
import { useOpenTrips, useTrips } from "@/features/trips/hooks";
import { useFuelEntries } from "@/features/fuel/hooks";
import { useAlerts } from "@/features/alerts/hooks";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { tripDurationStatus, formatDuration } from "@/services/trips.service";
import { buildDailySeries, buildStatusBreakdown } from "@/features/dashboard/lib/chart-data";
import { ActivityTrendChart } from "@/features/dashboard/components/activity-trend-chart";
import { FuelSpendChart } from "@/features/dashboard/components/fuel-spend-chart";
import { FleetStatusChart } from "@/features/dashboard/components/fleet-status-chart";

const STATUS_ORDER = [
  { key: "available", label: "Available" },
  { key: "outside", label: "Outside" },
  { key: "workshop", label: "Workshop" },
  { key: "inactive", label: "Inactive" },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { data: vehicles = [] } = useVehicles();
  const { data: openTrips = [] } = useOpenTrips();
  const { data: trips = [] } = useTrips();
  const { data: fuelEntries = [] } = useFuelEntries();
  const { data: alerts = [] } = useAlerts();

  const today = new Date().toDateString();
  const tripsToday = trips.filter((t) => new Date(t.outTime).toDateString() === today);
  const fuelToday = fuelEntries.filter((f) => new Date(f.dateTime).toDateString() === today);
  const kmToday = tripsToday.reduce((sum, t) => sum + (t.tripKm ?? 0), 0);
  const fuelCostToday = fuelToday.reduce((sum, f) => sum + f.total, 0);
  const avgTrip = tripsToday.length ? Math.round(kmToday / tripsToday.length) : 0;

  const atFactory = vehicles.filter((v) => v.status === "available").length;
  const workshop = vehicles.filter((v) => v.status === "workshop").length;

  const dailySeries = useMemo(() => buildDailySeries(trips, fuelEntries, 14), [trips, fuelEntries]);
  const statusBreakdown = useMemo(() => buildStatusBreakdown(vehicles, STATUS_ORDER), [vehicles]);
  const fourteenDayKm = dailySeries.reduce((sum, d) => sum + d.km, 0);
  const fourteenDayFuel = dailySeries.reduce((sum, d) => sum + d.fuelCost, 0);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Management Dashboard"
        description="Live snapshot of fleet activity, movement and exceptions."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <KpiCard label="Total Vehicles" value={vehicles.length} icon={Truck} onClick={() => navigate("/vehicles")} />
        <KpiCard label="At Factory" value={atFactory} icon={Warehouse} tone="success" onClick={() => navigate("/vehicles")} />
        <KpiCard label="Currently Outside" value={openTrips.length} icon={MapPinned} tone="warning" onClick={() => navigate("/vehicles-outside")} />
        <KpiCard label="Workshop" value={workshop} icon={Wrench} tone="destructive" onClick={() => navigate("/vehicles")} />
        <KpiCard label="KM Today" value={kmToday.toLocaleString()} icon={Route} onClick={() => navigate("/trips")} />
        <KpiCard label="Fuel Today (L)" value={fuelToday.reduce((s, f) => s + f.litres, 0)} icon={Fuel} onClick={() => navigate("/fuel")} />
        <KpiCard label="Fuel Cost Today" value={formatCurrency(fuelCostToday)} icon={Fuel} onClick={() => navigate("/fuel")} />
        <KpiCard label="Trips Today" value={tripsToday.length} icon={Route} onClick={() => navigate("/trips")} />
        <KpiCard label="Average Trip" value={`${avgTrip} KM`} icon={Route} />
        <KpiCard label="Maintenance Alerts" value={alerts.filter((a) => a.type === "maintenance").length} icon={Wrench} tone="warning" onClick={() => navigate("/alerts")} />
        <KpiCard label="Tyre Alerts" value={alerts.filter((a) => a.type === "tyre").length} icon={CircleDot} tone="warning" onClick={() => navigate("/alerts")} />
        <KpiCard label="Document Alerts" value={alerts.filter((a) => a.type === "document").length} icon={FileWarning} tone="destructive" onClick={() => navigate("/alerts")} />
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3 pb-2">
          <div>
            <CardTitle>Distance Covered</CardTitle>
            <CardDescription className="mt-1">Daily total across the fleet, last 14 days.</CardDescription>
          </div>
          <span className="font-tabular shrink-0 text-lg font-semibold text-foreground">
            {fourteenDayKm.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">km</span>
          </span>
        </CardHeader>
        <CardContent className="h-64 pt-2">
          <ActivityTrendChart data={dailySeries} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3 pb-2">
            <div>
              <CardTitle>Fuel Spend</CardTitle>
              <CardDescription className="mt-1">Daily total, last 14 days.</CardDescription>
            </div>
            <span className="font-tabular shrink-0 text-lg font-semibold text-foreground">
              {formatCurrency(fourteenDayFuel)}
            </span>
          </CardHeader>
          <CardContent className="h-56 pt-2">
            <FuelSpendChart data={dailySeries} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Fleet Status</CardTitle>
            <CardDescription className="mt-1">Live distribution across {vehicles.length} vehicles.</CardDescription>
          </CardHeader>
          <CardContent className="h-56 pt-2">
            <FleetStatusChart data={statusBreakdown} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle>Vehicles Currently Outside</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 pt-0">
            {openTrips.length === 0 && <EmptyState title="No vehicles are outside right now." />}
            {openTrips.map((trip) => {
              const vehicle = vehicles.find((v) => v.id === trip.vehicleId);
              return (
                <div
                  key={trip.id}
                  className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-tabular truncate font-medium text-foreground">
                      {vehicle?.registrationNumber ?? trip.vehicleId}
                    </p>
                    <p className="truncate text-muted-foreground">
                      {trip.purpose} → {trip.destination} · {formatDuration(trip.outTime)}
                    </p>
                  </div>
                  <StatusBadge status={tripDurationStatus(trip)} className="shrink-0" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle>Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 pt-0">
            {alerts.length === 0 && <EmptyState title="No active alerts." />}
            {alerts.slice(0, 6).map((alert) => (
              <div key={alert.id} className="flex flex-col gap-1 rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium capitalize">{alert.type.replace("_", " ")}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(alert.createdAt)}</span>
                </div>
                <p className="truncate text-muted-foreground">{alert.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
