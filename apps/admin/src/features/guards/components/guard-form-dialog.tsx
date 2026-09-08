import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { PhotoCapture } from "@/components/shared/photo-capture";
import { Button } from "@/components/ui/button";
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
import { useCreateGuard, useUpdateGuard } from "@/features/guards/hooks";
import { useMasterCollection } from "@/features/master-data/hooks";
import type { Guard } from "@/types";
import { fileToDataUrl } from "@/lib/utils";

const schema = z.object({
  guardId: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  photoUrl: z.string().optional(),
  companyIdCode: z.string().min(1, "Required"),
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

const emptyDefaults: FormValues = {
  guardId: "",
  name: "",
  photoUrl: undefined,
  companyIdCode: "",
  cnic: "",
  mobile: "",
  department: "",
  assignedGateId: "",
  dutyShift: "",
  guardType: "Security Guard",
  authorizedExit: true,
  authorizedIn: true,
};

// photoUrl stays undefined here for the same reason as DriverFormDialog: it only
// ever accepts a fresh base64 capture, never the record's existing photo URL.
function guardToFormValues(guard: Guard): FormValues {
  return {
    guardId: guard.guardId,
    name: guard.name,
    photoUrl: undefined,
    companyIdCode: guard.companyIdCode,
    cnic: guard.cnic,
    mobile: guard.mobile,
    department: guard.department ?? "",
    assignedGateId: guard.assignedGateId ?? "",
    dutyShift: guard.dutyShift ?? "",
    guardType: guard.guardType,
    authorizedExit: guard.authorizedExit,
    authorizedIn: guard.authorizedIn,
  };
}

interface GuardFormDialogProps {
  mode: "add" | "edit";
  /** Required when mode === "edit". */
  guard?: Guard;
}

/** Add/Edit Security Guard — one dialog for both. Used from the Guards list
 * page (add) and the Guard profile page (edit). */
export function GuardFormDialog({ mode, guard }: GuardFormDialogProps) {
  const { data: gates = [] } = useMasterCollection("gates");
  const { data: departments = [] } = useMasterCollection("departmentMasters");
  const createGuard = useCreateGuard();
  const updateGuard = useUpdateGuard();
  const [open, setOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: mode === "edit" && guard ? guardToFormValues(guard) : emptyDefaults,
  });

  function handleOpenChange(next: boolean) {
    if (next) {
      form.reset(mode === "edit" && guard ? guardToFormValues(guard) : emptyDefaults);
    }
    setOpen(next);
  }

  const isPending = createGuard.isPending || updateGuard.isPending;

  async function onSubmit(values: FormValues) {
    const payload = { ...values, assignedGateId: values.assignedGateId || undefined };
    try {
      if (mode === "edit" && guard) {
        await updateGuard.mutateAsync({ id: guard.id, patch: payload });
        toast.success(`${values.name} updated.`);
      } else {
        await createGuard.mutateAsync(payload);
        toast.success(`${values.name} added as a security guard.`);
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${mode === "edit" ? "update" : "add"} guard.`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {mode === "edit" ? (
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" /> Add Guard
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Security Guard" : "Add Security Guard"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <PhotoCapture
              label="Guard Photo"
              className="sm:col-span-2"
              initialPreviewUrl={guard?.photoUrl}
              onCapture={async (file) => form.setValue("photoUrl", await fileToDataUrl(file))}
            />
            <FormField label="Guard ID / Code" error={form.formState.errors.guardId?.message}>
              <Input {...form.register("guardId")} placeholder="e.g. GRD-1027" />
            </FormField>
            <FormField label="Full Name" error={form.formState.errors.name?.message}>
              <Input {...form.register("name")} placeholder="e.g. Bilal Ahmed" />
            </FormField>
            <FormField label="Company ID" error={form.formState.errors.companyIdCode?.message}>
              <Input {...form.register("companyIdCode")} placeholder="e.g. CMP-1027" />
            </FormField>
            <FormField label="CNIC" error={form.formState.errors.cnic?.message}>
              <Input {...form.register("cnic")} placeholder="e.g. 35201-1234567-1" />
            </FormField>
            <FormField label="Mobile" error={form.formState.errors.mobile?.message}>
              <Input {...form.register("mobile")} placeholder="e.g. 0300-1234567" />
            </FormField>
            <FormField label="Department">
              <Select value={form.watch("department")} onValueChange={(v) => form.setValue("department", v)}>
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
            <FormField label="Assigned Gate">
              <Select
                value={form.watch("assignedGateId")}
                onValueChange={(v) => form.setValue("assignedGateId", v)}
              >
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
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : mode === "edit" ? "Save Changes" : "Add Guard"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
