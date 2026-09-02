import { type ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { useTrips } from "@/features/trips/hooks";
import { useVehicles } from "@/features/vehicles/hooks";
import { useDrivers } from "@/features/drivers/hooks";
import { formatDateTime, formatKm } from "@/lib/formatters";
import type { Trip } from "@/types";

export function TripRegisterPage() {
  const { data: trips = [], isLoading } = useTrips();
  const { data: vehicles = [] } = useVehicles();
  const { data: drivers = [] } = useDrivers();

  const columns: ColumnDef<Trip>[] = [
    { accessorKey: "tripNumber", header: "Trip #" },
    {
      id: "vehicle",
      header: "Vehicle",
      cell: ({ row }) => vehicles.find((v) => v.id === row.original.vehicleId)?.registrationNumber ?? "—",
    },
    {
      id: "driver",
      header: "Driver",
      cell: ({ row }) => drivers.find((d) => d.id === row.original.driverId)?.name ?? "—",
    },
    { accessorKey: "purpose", header: "Purpose" },
    { accessorKey: "destination", header: "Destination" },
    {
      accessorKey: "outTime",
      header: "Out Time",
      cell: ({ getValue }) => formatDateTime(getValue<string>()),
    },
    {
      accessorKey: "tripKm",
      header: "Trip KM",
      cell: ({ getValue }) => formatKm(getValue<number | null | undefined>()),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => <StatusBadge status={getValue<Trip["status"]>()} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Trip Register" description="Complete history of Gate-Out / Gate-In movements." />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading trips…</p>
      ) : (
        <DataTable columns={columns} data={trips} searchPlaceholder="Search by trip, purpose or destination…" />
      )}
    </div>
  );
}
