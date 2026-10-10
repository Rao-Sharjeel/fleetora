import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { useDeleteTyre, useTyres } from "@/features/tyres/hooks";
import { TyreFormDialog } from "@/features/tyres/components/tyre-form-dialog";
import { useVehicles } from "@/features/vehicles/hooks";
import { formatKm } from "@/lib/formatters";
import { useCan } from "@/hooks/use-session";
import type { Tyre } from "@/types";

export function TyresPage() {
  const can = useCan();
  const { data: tyres = [], isLoading } = useTyres();
  const { data: vehicles = [] } = useVehicles();
  const deleteTyre = useDeleteTyre();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTyre, setEditingTyre] = useState<Tyre | null>(null);

  function openAdd() {
    setEditingTyre(null);
    setDialogOpen(true);
  }

  function openEdit(tyre: Tyre) {
    setEditingTyre(tyre);
    setDialogOpen(true);
  }

  async function handleDelete(tyre: Tyre) {
    if (!window.confirm(`Delete tyre "${tyre.tyreCode}"? This can't be undone.`)) return;
    try {
      await deleteTyre.mutateAsync(tyre.id);
      toast.success("Tyre deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete tyre.");
    }
  }

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
    ...(can("tyres.edit") || can("tyres.delete")
      ? [
          {
            id: "actions",
            header: "",
            cell: ({ row }) => (
              <div className="flex items-center gap-1">
                {can("tyres.edit") && (
                  <Button variant="ghost" size="icon" aria-label="Edit tyre" onClick={() => openEdit(row.original)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {can("tyres.delete") && (
                  <Button variant="ghost" size="icon" aria-label="Delete tyre" onClick={() => handleDelete(row.original)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ),
          } satisfies ColumnDef<Tyre>,
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tyre Management"
        description="Tyre inventory, position tracking and mileage life."
        actions={
          can("tyres.create") && (
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add Tyre
            </Button>
          )
        }
      />
      <DataTable columns={columns} data={tyres} searchPlaceholder="Search by tyre ID or brand…" isLoading={isLoading} />
      <TyreFormDialog open={dialogOpen} onOpenChange={setDialogOpen} tyre={editingTyre} />
    </div>
  );
}
