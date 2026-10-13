import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateRequisition, useUpdateRequisition } from "@/features/requisitions/hooks";
import { useMasterCollection } from "@/features/master-data/hooks";
import type { Requisition } from "@/types";

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

const emptyDefaults: FormValues = {
  requestedBy: "",
  department: "",
  purpose: "",
  destination: "",
  requiredDateTime: "",
  expectedReturn: "",
  approver: "",
};

function toFormValues(requisition: Requisition): FormValues {
  return {
    requestedBy: requisition.requestedBy,
    department: requisition.department,
    purpose: requisition.purpose,
    destination: requisition.destination,
    // <input type="datetime-local"> and Django's ISO string differ only by the
    // trailing seconds/offset, as in Trips.
    requiredDateTime: requisition.requiredDateTime ? requisition.requiredDateTime.slice(0, 16) : "",
    expectedReturn: requisition.expectedReturn ? requisition.expectedReturn.slice(0, 16) : "",
    approver: requisition.approver ?? "",
  };
}

interface RequisitionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null to raise a new one; a pending requisition to amend it. */
  requisition?: Requisition | null;
}

/**
 * One form for raising and amending a requisition.
 *
 * Editing is only ever offered while a requisition is still pending — the API
 * refuses once it has been approved or rejected — so there is no decided-state
 * variant of this form to design around.
 */
export function RequisitionFormDialog({ open, onOpenChange, requisition }: RequisitionFormDialogProps) {
  const { data: departments = [] } = useMasterCollection("departmentMasters");
  const { data: purposes = [] } = useMasterCollection("vehiclePurposes");
  const createRequisition = useCreateRequisition();
  const updateRequisition = useUpdateRequisition();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyDefaults });

  useEffect(() => {
    if (!open) return;
    form.reset(requisition ? toFormValues(requisition) : emptyDefaults);
  }, [open, requisition, form]);

  async function onSubmit(values: FormValues) {
    try {
      if (requisition) {
        await updateRequisition.mutateAsync({ id: requisition.id, patch: values });
        toast.success("Requisition updated.");
      } else {
        await createRequisition.mutateAsync(values);
        toast.success("Requisition submitted for approval.");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save requisition.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{requisition ? `Edit ${requisition.requisitionNumber}` : "New Vehicle Requisition"}</DialogTitle>
        </DialogHeader>
        <form key={requisition?.id ?? "new"} onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField label="Requested By" error={form.formState.errors.requestedBy?.message}>
            <Input {...form.register("requestedBy")} placeholder="e.g. Accounts" />
          </FormField>
          <FormField label="Department" error={form.formState.errors.department?.message}>
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
          <FormField label="Purpose" error={form.formState.errors.purpose?.message}>
            <Select value={form.watch("purpose")} onValueChange={(v) => form.setValue("purpose", v)}>
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
            <Button
              type="submit"
              loading={createRequisition.isPending || updateRequisition.isPending}
              loadingText="Saving…"
            >
              {requisition ? "Save Changes" : "Submit Requisition"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
