import { type ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { useTyres } from "@/features/tyres/hooks";
import { useVehicles } from "@/features/vehicles/hooks";
import { formatKm } from "@/lib/formatters";
import type { Tyre } from "@/types";

export function TyresPage() {
  const { data: tyres = [], isLoading } = useTyres();
  const { data: vehicles = [] } = useVehicles();

  const columns: ColumnDef<Tyre>[] = [
    { accessorKey: "tyreCode", header: "Tyre ID" },
    { accessorKey: "brand", header: "Brand" },
    { accessorKey: "size", header: "Size" },
    {
      id: "vehicle",
      header: "Vehicle",
      cell: ({ row }) => vehicles.find((v) => v.id === row.original.vehicleId)?.registrationNumber ?? "—",
    },
    { accessorKey: "wheelPosition", header: "Position" },
    {
      id: "mileage",
      header: "Mileage Used",
      cell: ({ row }) => {
        const vehicle = vehicles.find((v) => v.id === row.original.vehicleId);
        return vehicle ? formatKm(row.original.mileage ?? 0) : "—";
      },
    },
    {
      id: "remaining",
      header: "Remaining",
      cell: ({ row }) => {
        const vehicle = vehicles.find((v) => v.id === row.original.vehicleId);
        if (!vehicle) return "—";
        const remaining = row.original.remainingKm ?? row.original.expectedLifeKm;
        return (
          <span className="flex items-center gap-2">
            {formatKm(Math.abs(remaining))} {remaining < 0 && "over"}
            <StatusBadge status={remaining < 0 ? "overdue" : remaining < 5000 ? "due_soon" : "normal"} />
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => <span className="capitalize">{getValue<string>().replace("_", " ")}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Tyre Management" description="Tyre inventory, position tracking and mileage life." />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading tyres…</p>
      ) : (
        <DataTable columns={columns} data={tyres} searchPlaceholder="Search by tyre ID or brand…" />
      )}
    </div>
  );
}
