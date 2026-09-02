import { useMemo, useState } from "react";
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { Truck, Route, Fuel, Wrench, Wallet, Gauge } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiCard } from "@/components/shared/kpi-card";
import { useTrips } from "@/features/trips/hooks";
import { useFuelEntries } from "@/features/fuel/hooks";
import { useMaintenanceRecords } from "@/features/maintenance/hooks";
import { useVehicles } from "@/features/vehicles/hooks";
import { useDrivers } from "@/features/drivers/hooks";
import { formatCurrency, formatKm } from "@/lib/formatters";

type Period = "today" | "week" | "month" | "year";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Today (Daily)",
  week: "This Week (Weekly)",
  month: "This Month (Monthly)",
  year: "This Year (Annual)",
};

function periodInterval(period: Period, now: Date): { start: Date; end: Date } {
  switch (period) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "week":
      return { start: startOfWeek(now), end: endOfWeek(now) };
    case "year":
      return { start: startOfYear(now), end: endOfYear(now) };
    case "month":
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

export function ReportsPage() {
  const [period, setPeriod] = useState<Period>("month");
  const { data: trips = [] } = useTrips();
  const { data: fuelEntries = [] } = useFuelEntries();
  const { data: maintenanceRecords = [] } = useMaintenanceRecords();
  const { data: vehicles = [] } = useVehicles();
  const { data: drivers = [] } = useDrivers();

  const summary = useMemo(() => {
    const { start, end } = periodInterval(period, new Date());
    const inRange = (iso: string) => isWithinInterval(new Date(iso), { start, end });

    const periodTrips = trips.filter((t) => inRange(t.outTime));
    const periodFuel = fuelEntries.filter((f) => inRange(f.dateTime));
    const periodMaintenance = maintenanceRecords.filter((m) => inRange(m.date));

    const totalKm = periodTrips.reduce((sum, t) => sum + (t.tripKm ?? 0), 0);
    const totalFuelLitres = periodFuel.reduce((sum, f) => sum + f.litres, 0);
    const totalFuelCost = periodFuel.reduce((sum, f) => sum + f.total, 0);
    const maintenanceCost = periodMaintenance.reduce((sum, m) => sum + m.totalCost, 0);
    const totalOperatingCost = totalFuelCost + maintenanceCost;
    const avgKmpl = totalFuelLitres ? totalKm / totalFuelLitres : 0;
    const costPerKm = totalKm ? totalOperatingCost / totalKm : 0;

    return {
      totalTrips: periodTrips.length,
      totalKm,
      totalFuelLitres,
      totalFuelCost,
      maintenanceCost,
      totalOperatingCost,
      avgKmpl,
      costPerKm,
    };
  }, [period, trips, fuelEntries, maintenanceRecords]);

  const vehicleRows = vehicles.map((v) => {
    const vTrips = trips.filter((t) => t.vehicleId === v.id);
    const vFuel = fuelEntries.filter((f) => f.vehicleId === v.id);
    const vMaint = maintenanceRecords.filter((m) => m.vehicleId === v.id);
    const km = vTrips.reduce((s, t) => s + (t.tripKm ?? 0), 0);
    const litres = vFuel.reduce((s, f) => s + f.litres, 0);
    const fuelCost = vFuel.reduce((s, f) => s + f.total, 0);
    const maintCost = vMaint.reduce((s, m) => s + m.totalCost, 0);
    const kmpl = litres ? km / litres : 0;
    return { vehicle: v, trips: vTrips.length, km, litres, fuelCost, maintCost, kmpl, totalCost: fuelCost + maintCost };
  });

  const driverRows = drivers.map((d) => {
    const dTrips = trips.filter((t) => t.driverId === d.id);
    const km = dTrips.reduce((s, t) => s + (t.tripKm ?? 0), 0);
    return { driver: d, trips: dTrips.length, km };
  });

  const departmentRows = Object.entries(
    trips.reduce<Record<string, { trips: number; km: number }>>((acc, t) => {
      acc[t.department] = acc[t.department] ?? { trips: 0, km: 0 };
      acc[t.department].trips += 1;
      acc[t.department].km += t.tripKm ?? 0;
      return acc;
    }, {}),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Reports" description="Period summaries and vehicle-, driver- and department-wise performance." />

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="vehicle">Vehicle-wise</TabsTrigger>
          <TabsTrigger value="driver">Driver-wise</TabsTrigger>
          <TabsTrigger value="department">Department-wise</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 sm:w-64">
              <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PERIOD_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <KpiCard label="Total Vehicles" value={vehicles.length} icon={Truck} />
              <KpiCard label="Total Trips" value={summary.totalTrips} icon={Route} />
              <KpiCard label="Total KM" value={formatKm(summary.totalKm)} icon={Gauge} />
              <KpiCard label="Fuel Consumed" value={`${summary.totalFuelLitres.toFixed(1)} L`} icon={Fuel} />
              <KpiCard label="Avg. Fuel Average" value={`${summary.avgKmpl.toFixed(2)} KM/L`} icon={Fuel} tone="success" />
              <KpiCard label="Fuel Cost" value={formatCurrency(summary.totalFuelCost)} icon={Wallet} />
              <KpiCard label="Maintenance Cost" value={formatCurrency(summary.maintenanceCost)} icon={Wrench} tone="warning" />
              <KpiCard label="Total Operating Cost" value={formatCurrency(summary.totalOperatingCost)} icon={Wallet} tone="warning" />
              <KpiCard label="Cost / KM" value={formatCurrency(Math.round(summary.costPerKm))} icon={Gauge} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="vehicle">
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Performance</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {vehicleRows.map((row) => (
                <div key={row.vehicle.id} className="grid grid-cols-2 gap-2 rounded-md border border-border p-3 text-sm sm:grid-cols-6">
                  <span className="font-medium sm:col-span-1">{row.vehicle.registrationNumber}</span>
                  <span>{row.trips} trips</span>
                  <span>{formatKm(row.km)}</span>
                  <span>{row.kmpl.toFixed(1)} KM/L</span>
                  <span>{formatCurrency(row.fuelCost)} fuel</span>
                  <span>{formatCurrency(row.totalCost)} total</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="driver">
          <Card>
            <CardHeader>
              <CardTitle>Driver Performance</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {driverRows.map((row) => (
                <div key={row.driver.id} className="grid grid-cols-3 gap-2 rounded-md border border-border p-3 text-sm">
                  <span className="font-medium">{row.driver.name}</span>
                  <span>{row.trips} trips</span>
                  <span>{formatKm(row.km)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="department">
          <Card>
            <CardHeader>
              <CardTitle>Department Utilization</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {departmentRows.length === 0 && <EmptyState title="No trip data recorded yet." />}
              {departmentRows.map(([department, stats]) => (
                <div key={department} className="grid grid-cols-3 gap-2 rounded-md border border-border p-3 text-sm">
                  <span className="font-medium">{department}</span>
                  <span>{stats.trips} trips</span>
                  <span>{formatKm(stats.km)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
