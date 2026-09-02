import { useState, type ReactNode } from "react";
import { useForm, type DefaultValues, type FieldValues, type Resolver, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodType } from "zod";
import { Pencil, Plus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { MasterDataCollections, MasterDataKey } from "@/types/master-data";
import type { MasterStatus } from "@/types";
import { useCreateMasterRecord, useMasterCollection, useUpdateMasterRecord } from "@/features/master-data/hooks";

interface MasterRecord {
  id: string;
  code: string;
  name: string;
  status: MasterStatus;
}

interface MasterListPageProps<K extends MasterDataKey, T extends MasterRecord, TValues extends FieldValues> {
  masterKey: K;
  title: string;
  description: string;
  columns: ColumnDef<T>[];
  schema: ZodType<TValues>;
  defaultValues: DefaultValues<TValues>;
  renderFields: (form: UseFormReturn<TValues>) => ReactNode;
  addLabel?: string;
}

/**
 * Shared table + add/edit-dialog scaffold for the ~16 Fleetora master-setup screens
 * (Vehicle Type, Make, Model, Fuel Type, ...). Every one of them is a code/name/status
 * record with a handful of extra fields, so the table, status toggle and dialog
 * plumbing lives here once and each setup page only supplies its columns/schema/fields.
 */
export function MasterListPage<K extends MasterDataKey, T extends MasterRecord, TValues extends FieldValues>({
  masterKey,
  title,
  description,
  columns,
  schema,
  defaultValues,
  renderFields,
  addLabel = "Add Record",
}: MasterListPageProps<K, T, TValues>) {
  const { data: records = [], isLoading } = useMasterCollection(masterKey);
  const createRecord = useCreateMasterRecord(masterKey);
  const updateRecord = useUpdateMasterRecord(masterKey);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<TValues>({ resolver: zodResolver(schema as never) as Resolver<TValues>, defaultValues });

  function openAdd() {
    setEditingId(null);
    form.reset(defaultValues);
    setOpen(true);
  }

  function openEdit(record: T) {
    setEditingId(record.id);
    form.reset(record as unknown as TValues);
    setOpen(true);
  }

  async function onSubmit(values: TValues) {
    if (editingId) {
      await updateRecord.mutateAsync({ id: editingId, patch: values as unknown as Partial<MasterDataCollections[K]> });
      toast.success("Record updated.");
    } else {
      await createRecord.mutateAsync(values as unknown as Omit<MasterDataCollections[K], "id" | "status">);
      toast.success("Record added.");
    }
    setOpen(false);
  }

  function toggleStatus(record: T, checked: boolean) {
    updateRecord.mutate({
      id: record.id,
      patch: { status: checked ? "active" : "inactive" } as Partial<MasterDataCollections[K]>,
    });
  }

  const fullColumns: ColumnDef<T>[] = [
    ...columns,
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={row.original.status === "active"}
            onCheckedChange={(checked) => toggleStatus(row.original, checked === true)}
          />
          <Badge variant={row.original.status === "active" ? "success" : "muted"} dot={false}>
            {row.original.status === "active" ? "Active" : "Inactive"}
          </Badge>
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)} aria-label="Edit">
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={title}
        description={description}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAdd}>
                <Plus className="h-4 w-4" /> {addLabel}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Record" : addLabel}</DialogTitle>
              </DialogHeader>
              <form key={editingId ?? "new"} onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">{renderFields(form)}</div>
                <DialogFooter>
                  <Button type="submit" disabled={createRecord.isPending || updateRecord.isPending}>
                    Save
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <DataTable columns={fullColumns} data={records as unknown as T[]} searchPlaceholder="Search…" />
      )}
    </div>
  );
}
