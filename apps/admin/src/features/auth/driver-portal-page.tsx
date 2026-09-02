import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { useDrivers } from "@/features/drivers/hooks";
import { useTrips } from "@/features/trips/hooks";
import { useVehicles } from "@/features/vehicles/hooks";
import { formatDateTime, formatKm } from "@/lib/formatters";

/**
 * Optional-phase driver view (spec section 4): assigned trips only, no fleet
 * administration. Real auth will resolve the logged-in driver directly; the
 * mock session has no driver identity yet, so this previews with the first
 * seeded driver.
 */
export function DriverPortalPage() {
  const { data: drivers = [] } = useDrivers();
  const { data: trips = [] } = useTrips();
  const { data: vehicles = [] } = useVehicles();
  const driver = drivers[0];
  const myTrips = trips.filter((t) => t.driverId === driver?.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader title="My Trips" description={driver ? `Signed in as ${driver.name}` : undefined} />
      {myTrips.length === 0 ? (
        <EmptyState title="No trips assigned yet." />
      ) : (
        <div className="flex flex-col gap-3">
          {myTrips.map((trip) => {
            const vehicle = vehicles.find((v) => v.id === trip.vehicleId);
            return (
              <Card key={trip.id}>
                <CardContent className="flex items-center justify-between p-4 text-sm">
                  <div>
                    <p className="font-medium">
                      {vehicle?.registrationNumber} · {trip.purpose} → {trip.destination}
                    </p>
                    <p className="text-muted-foreground">
                      {formatDateTime(trip.outTime)} {trip.tripKm != null && `· ${formatKm(trip.tripKm)}`}
                    </p>
                  </div>
                  <StatusBadge status={trip.status} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
