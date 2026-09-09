import { type ColumnDef } from "@tanstack/react-table";
import { QrCode } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { printStaffIdCard } from "@/lib/qr-print";
import { useDrivers } from "@/features/drivers/hooks";
import { DriverFormDialog } from "@/features/drivers/components/driver-form-dialog";
import { licenceStatus } from "@/services/drivers.service";
import type { Driver } from "@/types";
import { formatDate } from "@/lib/formatters";

const columns: ColumnDef<Driver>[] = [
  {
    id: "photo",
    meta: { skeleton: "circle" },
    header: "",
    cell: ({ row }) => (
      <Avatar>
        <AvatarImage src={row.original.photoUrl} alt={row.original.name} />
        <AvatarFallback>{row.original.name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
    ),
  },
  { accessorKey: "employeeId", header: "Employee ID" },
  { accessorKey: "companyIdCode", header: "Company ID" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "department", header: "Department" },
  { accessorKey: "mobile", header: "Mobile" },
  {
    accessorKey: "licenceExpiry",
    header: "Licence Expiry",
    cell: ({ getValue }) => formatDate(getValue<string>()),
  },
  {
    id: "licenceStatus",
    meta: { skeleton: "badge" },
    header: "Licence Status",
    cell: ({ row }) => <StatusBadge status={licenceStatus(row.original.licenceExpiry)} />,
  },
  {
    id: "idCard",
    meta: { skeleton: "action" },
    header: "",
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Print ID card"
        onClick={(e) => {
          e.stopPropagation();
          printStaffIdCard({
            id: row.original.employeeId,
            name: row.original.name,
            role: "Driver",
            photoUrl: row.original.photoUrl,
          });
        }}
      >
        <QrCode className="h-4 w-4" />
      </Button>
    ),
  },
];

export function DriversListPage() {
  const { data: drivers = [], isLoading } = useDrivers();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Driver Master"
        description="Registered drivers, licence status and department assignment."
        actions={<DriverFormDialog mode="add" />}
      />
      <DataTable
        columns={columns}
        data={drivers}
        searchPlaceholder="Search by name or employee ID…"
        onRowClick={(driver) => navigate(`/drivers/${driver.id}`)}
        isLoading={isLoading}
      />
    </div>
  );
}
