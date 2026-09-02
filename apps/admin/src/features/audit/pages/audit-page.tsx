import { type ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { useAuditLog } from "@/features/audit/hooks";
import { formatDateTime } from "@/lib/formatters";
import type { AuditLogEntry } from "@/types";

const columns: ColumnDef<AuditLogEntry>[] = [
  { accessorKey: "timestamp", header: "Timestamp", cell: ({ getValue }) => formatDateTime(getValue<string>()) },
  { accessorKey: "user", header: "User" },
  { accessorKey: "transaction", header: "Transaction" },
  { accessorKey: "previousValue", header: "Previous", cell: ({ getValue }) => getValue<string>() ?? "—" },
  { accessorKey: "newValue", header: "New", cell: ({ getValue }) => getValue<string>() ?? "—" },
  { accessorKey: "reason", header: "Reason", cell: ({ getValue }) => getValue<string>() ?? "—" },
];

export function AuditPage() {
  const { data: entries = [], isLoading } = useAuditLog();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Audit Trail" description="Every administrative override and correction, with reason." />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading audit log…</p>
      ) : (
        <DataTable columns={columns} data={entries} searchPlaceholder="Search audit trail…" />
      )}
    </div>
  );
}
