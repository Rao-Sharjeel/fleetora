import { type ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { useDocuments } from "@/features/documents/hooks";
import { useVehicles } from "@/features/vehicles/hooks";
import { useDrivers } from "@/features/drivers/hooks";
import { documentAlertStatus, daysUntil } from "@/services/documents.service";
import { formatDate } from "@/lib/formatters";
import type { DocumentRecord } from "@/types";

export function DocumentsPage() {
  const { data: documents = [], isLoading } = useDocuments();
  const { data: vehicles = [] } = useVehicles();
  const { data: drivers = [] } = useDrivers();

  const columns: ColumnDef<DocumentRecord>[] = [
    {
      id: "owner",
      header: "Owner",
      cell: ({ row }) => {
        const doc = row.original;
        return doc.ownerType === "vehicle"
          ? vehicles.find((v) => v.id === doc.ownerId)?.registrationNumber ?? "—"
          : drivers.find((d) => d.id === doc.ownerId)?.name ?? "—";
      },
    },
    { accessorKey: "ownerType", header: "Type", cell: ({ getValue }) => <span className="capitalize">{getValue<string>()}</span> },
    { accessorKey: "documentType", header: "Document" },
    { accessorKey: "documentNumber", header: "Number", cell: ({ getValue }) => getValue<string>() ?? "—" },
    { accessorKey: "expiryDate", header: "Expiry", cell: ({ getValue }) => formatDate(getValue<string>()) },
    {
      id: "daysLeft",
      header: "Days Left",
      cell: ({ row }) => daysUntil(row.original.expiryDate),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={documentAlertStatus(row.original.expiryDate)} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Vehicle & Driver Documents" description="Registration, insurance, permits and licence expiry tracking." />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading documents…</p>
      ) : (
        <DataTable columns={columns} data={documents} searchPlaceholder="Search documents…" />
      )}
    </div>
  );
}
