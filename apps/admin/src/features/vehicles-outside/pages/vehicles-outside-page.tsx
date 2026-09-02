import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { useOpenTrips } from "@/features/trips/hooks";
import { useVehicles } from "@/features/vehicles/hooks";
import { useDrivers } from "@/features/drivers/hooks";
import { formatDuration } from "@/services/trips.service";
import { formatKm, formatTime } from "@/lib/formatters";

export function VehiclesOutsidePage() {
  const { data: trips = [], isLoading } = useOpenTrips();
  const { data: vehicles = [] } = useVehicles();
  const { data: drivers = [] } = useDrivers();

  // Re-render every 30s so "Duration" keeps climbing without a manual refresh.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Vehicles Currently Outside" description="Live list of all open trips." />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : trips.length === 0 ? (
        <EmptyState title="No vehicles are outside right now." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => {
            const vehicle = vehicles.find((v) => v.id === trip.vehicleId);
            const driver = drivers.find((d) => d.id === trip.driverId);
            return (
              <Card key={trip.id}>
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{vehicle?.registrationNumber ?? trip.vehicleId}</span>
                    <StatusBadge status={trip.tripDurationStatus ?? "normal"} />
                  </div>
                  <p className="text-sm text-muted-foreground">{driver?.name ?? trip.driverId}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>Out: {formatTime(trip.outTime)}</span>
                    <span>Odo: {formatKm(trip.odometerOut)}</span>
                    <span>{trip.purpose}</span>
                    <span>{trip.destination}</span>
                  </div>
                  <p className="text-sm font-medium">{formatDuration(trip.outTime)} elapsed</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
