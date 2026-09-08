import { type ColumnDef } from "@tanstack/react-table";
import { QrCode } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { printStaffIdCard } from "@/lib/qr-print";
import { useGuards } from "@/features/guards/hooks";
import { GuardFormDialog } from "@/features/guards/components/guard-form-dialog";
import type { Guard } from "@/types";

const columns: ColumnDef<Guard>[] = [
  {
    id: "photo",
    header: "",
    cell: ({ row }) => (
      <Avatar>
        <AvatarImage src={row.original.photoUrl} alt={row.original.name} />
        <AvatarFallback>{row.original.name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
    ),
  },
  { accessorKey: "guardId", header: "Guard ID" },
  { accessorKey: "companyIdCode", header: "Company ID" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "department", header: "Department" },
  { accessorKey: "dutyShift", header: "Duty Shift" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const status = getValue<Guard["status"]>();
      return (
        <Badge variant={status === "active" ? "success" : "muted"} dot={false}>
          {status === "active" ? "Active" : "Inactive"}
        </Badge>
      );
    },
  },
  {
    id: "idCard",
    header: "",
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Print ID card"
        onClick={(e) => {
          e.stopPropagation();
          printStaffIdCard({
            id: row.original.guardId,
            name: row.original.name,
            role: row.original.guardType,
            department: row.original.department,
          });
        }}
      >
        <QrCode className="h-4 w-4" />
      </Button>
    ),
  },
];

export function GuardsListPage() {
  const { data: guards = [], isLoading } = useGuards();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Security Guard Setup"
        description="Guards authorized to operate Gate-Out / Gate-In on the mobile app."
        actions={<GuardFormDialog mode="add" />}
      />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading guards…</p>
      ) : (
        <DataTable
          columns={columns}
          data={guards}
          searchPlaceholder="Search by name or guard ID…"
          onRowClick={(guard) => navigate(`/guards/${guard.id}`)}
        />
      )}
    </div>
  );
}
