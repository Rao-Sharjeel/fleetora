import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, QrCode } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { FormField } from "@/components/shared/form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { printStaffIdCard } from "@/lib/qr-print";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateGuard, useGuards } from "@/features/guards/hooks";
import { useMasterCollection } from "@/features/master-data/hooks";
import { DEPARTMENTS } from "@/services/mock/fixtures";
import type { Guard } from "@/types";

const schema = z.object({
  guardId: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  cnic: z.string().min(1, "Required"),
  mobile: z.string().min(1, "Required"),
  department: z.string().optional(),
  assignedGateId: z.string().optional(),
  dutyShift: z.string().optional(),
  guardType: z.string().min(1, "Required"),
  authorizedExit: z.boolean(),
  authorizedIn: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

const columns: ColumnDef<Guard>[] = [
  { accessorKey: "guardId", header: "Guard ID" },
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
            role: row.original.department ?? row.original.guardType,
            photoUrl: row.original.photoUrl,
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
  const { data: gates = [] } = useMasterCollection("gates");
  const createGuard = useCreateGuard();
  const [open, setOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      guardId: "",
      name: "",
      cnic: "",
      mobile: "",
      department: "",
      assignedGateId: "",
      dutyShift: "",
      guardType: "Security Guard",
      authorizedExit: true,
      authorizedIn: true,
    },
  });

  async function onSubmit(values: FormValues) {
    await createGuard.mutateAsync(values);
    toast.success(`${values.name} added as a security guard.`);
    form.reset();
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Security Guard Setup"
        description="Guards authorized to operate Gate-Out / Gate-In on the mobile app."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> Add Guard
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Security Guard</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Guard ID / Code" error={form.formState.errors.guardId?.message}>
                    <Input {...form.register("guardId")} placeholder="e.g. GRD-1027" />
                  </FormField>
                  <FormField label="Full Name" error={form.formState.errors.name?.message}>
                    <Input {...form.register("name")} placeholder="e.g. Bilal Ahmed" />
                  </FormField>
                  <FormField label="CNIC" error={form.formState.errors.cnic?.message}>
                    <Input {...form.register("cnic")} placeholder="e.g. 35201-1234567-1" />
                  </FormField>
                  <FormField label="Mobile" error={form.formState.errors.mobile?.message}>
                    <Input {...form.register("mobile")} placeholder="e.g. 0300-1234567" />
                  </FormField>
                  <FormField label="Department">
                    <Select onValueChange={(v) => form.setValue("department", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Assigned Gate">
                    <Select onValueChange={(v) => form.setValue("assignedGateId", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gate" />
                      </SelectTrigger>
                      <SelectContent>
                        {gates.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Duty Shift">
                    <Input {...form.register("dutyShift")} placeholder="e.g. Day (08:00 - 20:00)" />
                  </FormField>
                  <FormField label="Guard Type" error={form.formState.errors.guardType?.message}>
                    <Input {...form.register("guardType")} placeholder="e.g. Security Guard" />
                  </FormField>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="authorizedExit"
                      checked={form.watch("authorizedExit")}
                      onCheckedChange={(v) => form.setValue("authorizedExit", v === true)}
                    />
                    <Label htmlFor="authorizedExit">Authorized for FLEETORA EXIT</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="authorizedIn"
                      checked={form.watch("authorizedIn")}
                      onCheckedChange={(v) => form.setValue("authorizedIn", v === true)}
                    />
                    <Label htmlFor="authorizedIn">Authorized for FLEETORA IN</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createGuard.isPending}>
                    Add Guard
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading guards…</p>
      ) : (
        <DataTable columns={columns} data={guards} searchPlaceholder="Search by name or guard ID…" />
      )}
    </div>
  );
}
