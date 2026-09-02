import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateRequisition, useRequisitions } from "@/features/requisitions/hooks";
import { useMasterCollection } from "@/features/master-data/hooks";
import type { Requisition } from "@/types";
import { formatDateTime } from "@/lib/formatters";

const schema = z.object({
  requestedBy: z.string().min(1, "Required"),
  department: z.string().min(1, "Required"),
  purpose: z.string().min(1, "Required"),
  destination: z.string().min(1, "Required"),
  requiredDateTime: z.string().min(1, "Required"),
  expectedReturn: z.string().optional(),
  approver: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

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
];

export function RequisitionsPage() {
  const { data: requisitions = [], isLoading } = useRequisitions();
  const { data: departments = [] } = useMasterCollection("departmentMasters");
  const { data: purposes = [] } = useMasterCollection("vehiclePurposes");
  const createRequisition = useCreateRequisition();
  const [open, setOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { requestedBy: "", department: "", purpose: "", destination: "", requiredDateTime: "" },
  });

  async function onSubmit(values: FormValues) {
    await createRequisition.mutateAsync(values);
    toast.success("Requisition submitted for approval.");
    form.reset();
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Vehicle Requisition & Authorization"
        description="Prior authorization requests for vehicle use, before Gate-Out."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> New Requisition
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Vehicle Requisition</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <FormField label="Requested By" error={form.formState.errors.requestedBy?.message}>
                  <Input {...form.register("requestedBy")} placeholder="e.g. Accounts" />
                </FormField>
                <FormField label="Department" error={form.formState.errors.department?.message}>
                  <Select onValueChange={(v) => form.setValue("department", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.name}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Purpose" error={form.formState.errors.purpose?.message}>
                  <Select onValueChange={(v) => form.setValue("purpose", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select purpose" />
                    </SelectTrigger>
                    <SelectContent>
                      {purposes.map((p) => (
                        <SelectItem key={p.id} value={p.name}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Destination" error={form.formState.errors.destination?.message}>
                  <Input {...form.register("destination")} placeholder="e.g. Gulberg, Lahore" />
                </FormField>
                <FormField label="Required Date/Time" error={form.formState.errors.requiredDateTime?.message}>
                  <Input type="datetime-local" {...form.register("requiredDateTime")} />
                </FormField>
                <FormField label="Expected Return (optional)">
                  <Input type="datetime-local" {...form.register("expectedReturn")} />
                </FormField>
                <FormField label="Approver (optional)">
                  <Input {...form.register("approver")} placeholder="e.g. Fleet Manager" />
                </FormField>
                <DialogFooter>
                  <Button type="submit" disabled={createRequisition.isPending}>
                    Submit Requisition
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading requisitions…</p>
      ) : (
        <DataTable columns={columns} data={requisitions} searchPlaceholder="Search requisitions…" />
      )}
    </div>
  );
}
