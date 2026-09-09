import { type ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { QrCode } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { useVehicles } from "@/features/vehicles/hooks";
import { VehicleFormDialog } from "@/features/vehicles/components/vehicle-form-dialog";
import type { Vehicle } from "@/types";
import { formatKm } from "@/lib/formatters";
import { printVehicleQrLabel } from "@/lib/qr-print";

const columns: ColumnDef<Vehicle>[] = [
  { accessorKey: "internalId", header: "ID" },
  { accessorKey: "registrationNumber", header: "Registration" },
  {
    id: "vehicle",
    header: "Vehicle",
    cell: ({ row }) =>
      `${row.original.make} ${row.original.model}${row.original.variant ? ` ${row.original.variant}` : ""}`,
  },
  { accessorKey: "departmentCostCentre", header: "Department" },
  {
    accessorKey: "currentOdometer",
    header: "Odometer",
    cell: ({ getValue }) => formatKm(getValue<number>()),
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { skeleton: "badge" },
    cell: ({ getValue }) => <StatusBadge status={getValue<Vehicle["status"]>()} />,
  },
  {
    id: "qr",
    meta: { skeleton: "action" },
    header: "",
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Print QR label"
        onClick={(e) => {
          e.stopPropagation();
          printVehicleQrLabel(row.original.registrationNumber, row.original.qrCode);
        }}
      >
        <QrCode className="h-4 w-4" />
      </Button>
    ),
  },
];

export function VehiclesListPage() {
  const { data: vehicles = [], isLoading } = useVehicles();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Vehicle Master"
        description="All registered vehicles and their live status. Click a row to open its profile."
        actions={<VehicleFormDialog mode="add" />}
      />
      <DataTable
        columns={columns}
        data={vehicles}
        searchPlaceholder="Search by registration, make or department…"
        onRowClick={(vehicle) => navigate(`/vehicles/${vehicle.id}`)}
        isLoading={isLoading}
      />
    </div>
  );
}
