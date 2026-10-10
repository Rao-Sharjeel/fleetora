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
import { useCreateTyre, useUpdateTyre } from "@/features/tyres/hooks";
import { useVehicles } from "@/features/vehicles/hooks";
import type { Tyre } from "@/types";

const NONE = "__none__";

const STATUSES: Tyre["status"][] = ["in_use", "spare", "scrap", "store"];

const schema = z.object({
  tyreCode: z.string().min(1, "Required"),
  brand: z.string().min(1, "Required"),
  size: z.string().min(1, "Required"),
  serialNumber: z.string().min(1, "Required"),
  vehicleId: z.string().optional(),
  wheelPosition: z.string().optional(),
  installDate: z.string().optional(),
  installOdometer: z.number().min(0, "Must be 0 or greater").optional(),
  expectedLifeKm: z.number().min(0, "Must be 0 or greater"),
  status: z.enum(["in_use", "spare", "scrap", "store"]),
});
type FormValues = z.infer<typeof schema>;

const emptyDefaults: FormValues = {
  tyreCode: "",
  brand: "",
  size: "",
  serialNumber: "",
  vehicleId: undefined,
  wheelPosition: "",
  installDate: "",
  installOdometer: undefined,
  expectedLifeKm: 0,
  status: "store",
};

interface TyreFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tyre?: Tyre | null;
}

export function TyreFormDialog({ open, onOpenChange, tyre }: TyreFormDialogProps) {
  const { data: vehicles = [] } = useVehicles();
  const createTyre = useCreateTyre();
  const updateTyre = useUpdateTyre();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyDefaults });

  useEffect(() => {
    if (!open) return;
    form.reset(tyre ? { ...emptyDefaults, ...tyre } : emptyDefaults);
  }, [open, tyre, form]);

  async function onSubmit(values: FormValues) {
    const payload = { ...values, vehicleId: values.vehicleId || undefined };
    try {
      if (tyre) {
        await updateTyre.mutateAsync({ id: tyre.id, patch: payload });
        toast.success("Tyre updated.");
      } else {
        await createTyre.mutateAsync(payload);
        toast.success("Tyre added.");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save tyre.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tyre ? "Edit Tyre" : "Add Tyre"}</DialogTitle>
        </DialogHeader>
        <form key={tyre?.id ?? "new"} onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Tyre Code" error={form.formState.errors.tyreCode?.message}>
              <Input {...form.register("tyreCode")} placeholder="e.g. TYR-0042" />
            </FormField>
            <FormField label="Brand" error={form.formState.errors.brand?.message}>
              <Input {...form.register("brand")} placeholder="e.g. Bridgestone" />
            </FormField>
            <FormField label="Size" error={form.formState.errors.size?.message}>
              <Input {...form.register("size")} placeholder="e.g. 205/65 R15" />
            </FormField>
            <FormField label="Serial Number" error={form.formState.errors.serialNumber?.message}>
              <Input {...form.register("serialNumber")} />
            </FormField>
            <FormField label="Vehicle">
              <Select
                value={form.watch("vehicleId") ?? NONE}
                onValueChange={(v) => form.setValue("vehicleId", v === NONE ? undefined : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unassigned</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.registrationNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Wheel Position">
              <Input {...form.register("wheelPosition")} placeholder="e.g. Front Left" />
            </FormField>
            <FormField label="Install Date">
              <Input type="date" {...form.register("installDate")} />
            </FormField>
            <FormField label="Install Odometer" error={form.formState.errors.installOdometer?.message}>
              <Input type="number" {...form.register("installOdometer", { valueAsNumber: true })} />
            </FormField>
            <FormField label="Expected Life (KM)" error={form.formState.errors.expectedLifeKm?.message}>
              <Input type="number" {...form.register("expectedLifeKm", { valueAsNumber: true })} />
            </FormField>
            <FormField label="Status">
              <Select
                value={form.watch("status")}
                onValueChange={(v) => form.setValue("status", v as Tyre["status"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <DialogFooter>
            <Button type="submit" loading={createTyre.isPending || updateTyre.isPending} loadingText="Saving…">
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
