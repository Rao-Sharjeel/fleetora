import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  useDecideRequisition,
  useDeleteRequisition,
  useRequisitions,
} from "@/features/requisitions/hooks";
import { RequisitionFormDialog } from "@/features/requisitions/components/requisition-form-dialog";
import { isDecided } from "@/services/requisitions.service";
import type { Requisition } from "@/types";
import { formatDateTime } from "@/lib/formatters";
import { useCan } from "@/hooks/use-session";

export function RequisitionsPage() {
  const { data: requisitions = [], isLoading } = useRequisitions();
  const deleteRequisition = useDeleteRequisition();
  const decide = useDecideRequisition();
  const can = useCan();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Requisition | null>(null);

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(requisition: Requisition) {
    setEditing(requisition);
    setDialogOpen(true);
  }

  async function handleDelete(requisition: Requisition) {
    if (!window.confirm(`Delete ${requisition.requisitionNumber}? This can't be undone.`)) return;
    try {
      await deleteRequisition.mutateAsync(requisition.id);
      toast.success("Requisition deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete requisition.");
    }
  }

  async function handleDecide(requisition: Requisition, decision: "approve" | "reject") {
    const verb = decision === "approve" ? "Approve" : "Reject";
    if (!window.confirm(`${verb} ${requisition.requisitionNumber}?`)) return;
    try {
      await decide.mutateAsync({ id: requisition.id, decision });
      toast.success(`Requisition ${decision === "approve" ? "approved" : "rejected"}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${decision} requisition.`);
    }
  }

  const canDecide = can("requisitions.approve");
  const canEdit = can("requisitions.edit");
  const canDelete = can("requisitions.delete");

  const columns: ColumnDef<Requisition>[] = [
    { accessorKey: "requisitionNumber", header: "Requisition #" },
    { accessorKey: "requestedBy", header: "Requested By" },
    { accessorKey: "department", header: "Department" },
    { accessorKey: "purpose", header: "Purpose" },
    { accessorKey: "destination", header: "Destination" },
    {
      accessorKey: "requiredDateTime",
      header: "Required",
      cell: ({ getValue }) => formatDateTime(getValue<string>()),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => <StatusBadge status={getValue<Requisition["status"]>() as never} />,
    },
    ...(canDecide || canEdit || canDelete
      ? [
          {
            id: "actions",
            meta: { skeleton: "action" },
            header: "",
            cell: ({ row }) => {
              const requisition = row.original;
              // Every action here only applies to a requisition nobody has
              // acted on yet. The API refuses the rest with a 409; hiding them
              // is so nobody is offered a button that cannot work.
              if (isDecided(requisition)) {
                return <span className="text-xs text-muted-foreground">Decided</span>;
              }
              return (
                <div className="flex items-center gap-1">
                  {canDecide && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Approve requisition"
                        onClick={() => handleDecide(requisition, "approve")}
                      >
                        <Check className="h-4 w-4 text-success" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Reject requisition"
                        onClick={() => handleDecide(requisition, "reject")}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit requisition"
                      onClick={() => openEdit(requisition)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete requisition"
                      onClick={() => handleDelete(requisition)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            },
          } satisfies ColumnDef<Requisition>,
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Vehicle Requisition & Authorization"
        description="Prior authorization requests for vehicle use, before Gate-Out."
        actions={
          can("requisitions.create") && (
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" /> New Requisition
            </Button>
          )
        }
      />
      <DataTable columns={columns} data={requisitions} searchPlaceholder="Search requisitions…" isLoading={isLoading} />
      <RequisitionFormDialog open={dialogOpen} onOpenChange={setDialogOpen} requisition={editing} />
    </div>
  );
}
