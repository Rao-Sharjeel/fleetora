import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { KpiCard } from "@/components/shared/kpi-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useFuelEntries } from "@/features/fuel/hooks";
import { useVehicles } from "@/features/vehicles/hooks";
import { FuelEntryForm } from "@/features/fuel/components/fuel-entry-form";
import { formatCurrency, formatDateTime, formatKm } from "@/lib/formatters";
import type { FuelEntry } from "@/types";

export function FuelPage() {
  const { data: entries = [], isLoading } = useFuelEntries();
  const { data: vehicles = [] } = useVehicles();
  const [open, setOpen] = useState(false);

  const totalLitres = entries.reduce((sum, e) => sum + e.litres, 0);
  const totalCost = entries.reduce((sum, e) => sum + e.total, 0);

  const columns: ColumnDef<FuelEntry>[] = [
    {
      id: "vehicle",
      header: "Vehicle",
      cell: ({ row }) => vehicles.find((v) => v.id === row.original.vehicleId)?.registrationNumber ?? "—",
    },
    { accessorKey: "dateTime", header: "Date", cell: ({ getValue }) => formatDateTime(getValue<string>()) },
    { accessorKey: "odometer", header: "Odometer", cell: ({ getValue }) => formatKm(getValue<number>()) },
    { accessorKey: "litres", header: "Litres" },
    { accessorKey: "ratePerLitre", header: "Rate/L", cell: ({ getValue }) => formatCurrency(getValue<number>()) },
    { accessorKey: "total", header: "Total", cell: ({ getValue }) => formatCurrency(getValue<number>()) },
    { accessorKey: "fuelStation", header: "Station" },
    { accessorKey: "paymentMethod", header: "Payment" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Fuel Management"
        description="Fuel entries, cost and consumption tracking."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> New Fuel Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Fuel Entry</DialogTitle>
              </DialogHeader>
              <FuelEntryForm onSaved={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard label="Total Entries" value={entries.length} />
        <KpiCard label="Total Litres" value={totalLitres.toFixed(0)} />
        <KpiCard label="Total Fuel Cost" value={formatCurrency(totalCost)} />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading fuel entries…</p>
      ) : (
        <DataTable columns={columns} data={entries} searchPlaceholder="Search by station or payment method…" />
      )}
    </div>
  );
}
