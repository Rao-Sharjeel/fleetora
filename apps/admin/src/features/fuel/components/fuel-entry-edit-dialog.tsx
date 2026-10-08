import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateFuelEntry } from "@/features/fuel/hooks";
import { useDrivers } from "@/features/drivers/hooks";
import { useVehicles } from "@/features/vehicles/hooks";
import { PAYMENT_METHODS } from "@/services/fuel.service";
import { formatCurrency } from "@/lib/formatters";
import type { FuelEntry } from "@/types";

// Deliberately not a mode on FuelEntryForm: that form is built for the kiosk
// flow — it starts from a QR scan, pulls the odometer off the scanned vehicle
// and resets itself to scan the next one. An admin correcting a recorded entry
// is editing fields that already exist, so it is a plain form with no scanner.
const schema = z.object({
  vehicleId: z.string().min(1, "Required"),
  driverId: z.string().min(1, "Required"),
  dateTime: z.string().min(1, "Required"),
  // Stays optional: an entry whose odometer was unreadable at the gate has a
  // null reading and an open OdometerIssue, and editing the station or rate
  // must not force a number to be invented here.
  odometer: z.number().min(0, "Must be 0 or greater").optional(),
  litres: z.number().positive("Must be greater than 0"),
  ratePerLitre: z.number().positive("Must be greater than 0"),
  fuelStation: z.string().min(1, "Required"),
  paymentMethod: z.string().min(1, "Required"),
  receiptNo: z.string().optional(),
  fullTank: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

function toFormValues(entry: FuelEntry): FormValues {
  return {
    vehicleId: entry.vehicleId,
    driverId: entry.driverId,
    // Same trim as Trips/Requisitions: <input type="datetime-local"> and
    // Django's ISO string differ only by the trailing seconds/offset.
    dateTime: entry.dateTime ? entry.dateTime.slice(0, 16) : "",
    odometer: entry.odometer ?? undefined,
    litres: entry.litres,
    ratePerLitre: entry.ratePerLitre,
    fuelStation: entry.fuelStation,
    paymentMethod: entry.paymentMethod,
    receiptNo: entry.receiptNo ?? "",
    fullTank: entry.fullTank,
  };
}

interface FuelEntryEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: FuelEntry | null;
}

export function FuelEntryEditDialog({ open, onOpenChange, entry }: FuelEntryEditDialogProps) {
  const { data: vehicles = [] } = useVehicles();
  const { data: drivers = [] } = useDrivers();
  const updateFuelEntry = useUpdateFuelEntry();
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open || !entry) return;
    form.reset(toFormValues(entry));
  }, [open, entry, form]);

  // Mirrors the server: total is litres x rate, recomputed on save. Shown here
  // only so the person can see the figure they are changing it to.
  const total = (form.watch("litres") || 0) * (form.watch("ratePerLitre") || 0);

  async function onSubmit(values: FormValues) {
    if (!entry) return;
    try {
      await updateFuelEntry.mutateAsync({ id: entry.id, patch: values });
      toast.success("Fuel entry updated.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update fuel entry.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Fuel Entry</DialogTitle>
        </DialogHeader>
        <form key={entry?.id ?? "none"} onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Vehicle" error={form.formState.errors.vehicleId?.message}>
              <Select value={form.watch("vehicleId") ?? ""} onValueChange={(v) => form.setValue("vehicleId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.registrationNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Driver" error={form.formState.errors.driverId?.message}>
              <Select value={form.watch("driverId") ?? ""} onValueChange={(v) => form.setValue("driverId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Date & Time" error={form.formState.errors.dateTime?.message}>
              <Input type="datetime-local" {...form.register("dateTime")} />
            </FormField>
            <FormField label="Odometer (KM)" error={form.formState.errors.odometer?.message}>
              <Input type="number" {...form.register("odometer", { valueAsNumber: true })} />
            </FormField>
            <FormField label="Litres" error={form.formState.errors.litres?.message}>
              <Input type="number" step="0.01" {...form.register("litres", { valueAsNumber: true })} />
            </FormField>
            <FormField label="Rate / Litre" error={form.formState.errors.ratePerLitre?.message}>
              <Input type="number" step="0.01" {...form.register("ratePerLitre", { valueAsNumber: true })} />
            </FormField>
            <FormField label="Fuel Station" error={form.formState.errors.fuelStation?.message}>
              <Input {...form.register("fuelStation")} />
            </FormField>
            <FormField label="Payment Method" error={form.formState.errors.paymentMethod?.message}>
              <Select
                value={form.watch("paymentMethod") ?? ""}
                onValueChange={(v) => form.setValue("paymentMethod", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Receipt No.">
              <Input {...form.register("receiptNo")} />
            </FormField>
            <div className="flex items-center gap-2">
              <Checkbox
                id="editFullTank"
                checked={form.watch("fullTank") ?? false}
                onCheckedChange={(v) => form.setValue("fullTank", v === true)}
              />
              <Label htmlFor="editFullTank">Full tank</Label>
            </div>
            <p className="text-sm font-medium sm:col-span-2">Total: {formatCurrency(total)}</p>
          </div>
          <DialogFooter>
            <Button type="submit" loading={updateFuelEntry.isPending} loadingText="Saving…">
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
