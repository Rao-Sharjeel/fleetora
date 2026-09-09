import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus, Car, Settings2, Building2, Gauge, Loader2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { PhotoCapture } from "@/components/shared/photo-capture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogTrigger, FullScreenDialogContent } from "@/components/ui/dialog";
import {
  FormModalHeader,
  FormModalNav,
  FormModalBody,
  FormModalFooter,
  FormSection,
  useFormModalScrollSpy,
  type FormModalSection,
} from "@/components/shared/form-modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateVehicle, useUpdateVehicle } from "@/features/vehicles/hooks";
import type { Vehicle } from "@/types";
import { emptyToUndefined, fileToDataUrl } from "@/lib/utils";

const FUEL_TYPES: Vehicle["fuelType"][] = ["petrol", "diesel", "other"];
const TRANSMISSIONS: NonNullable<Vehicle["transmission"]>[] = ["manual", "automatic"];

const VEHICLE_SECTIONS: FormModalSection[] = [
  { id: "identity", label: "Identity & Registration", icon: Car },
  { id: "specifications", label: "Specifications", icon: Settings2 },
  { id: "operations", label: "Operations", icon: Building2 },
  { id: "alerts", label: "Fuel Alerts", icon: Gauge },
  { id: "maintenance", label: "Maintenance Schedule", icon: Wrench },
];

const schema = z.object({
  registrationNumber: z.string().min(1, "Required"),
  company: z.string().min(1, "Required"),
  make: z.string().min(1, "Required"),
  model: z.string().min(1, "Required"),
  variant: z.string().optional(),
  photoUrl: z.string().optional(),
  year: z.number().int("Whole number").min(1980, "Too old").max(new Date().getFullYear() + 1, "Not yet"),
  colour: z.string().min(1, "Required"),
  fuelType: z.enum(["petrol", "diesel", "other"]),
  departmentCostCentre: z.string().optional(),
  expectedFuelAverageKmpl: z.number().positive("Must be greater than 0"),
  currentOdometer: z.number().min(0, "Must be 0 or greater"),
  seatingCapacity: z.number().int().positive().optional(),
  transmission: z.enum(["manual", "automatic"]).optional(),
  driveType: z.string().optional(),
  bodyType: z.string().optional(),
  fuelAverageAlertLow: z.number().optional(),
  fuelAverageAlertHigh: z.number().optional(),
  oilChangeKm: z.number().optional(),
  tyreChangeKm: z.number().optional(),
  fuelFilterChangeKm: z.number().optional(),
  gearOilChangeKm: z.number().optional(),
  timingBeltChangeKm: z.number().optional(),
});
type FormValues = z.infer<typeof schema>;

const emptyDefaults: FormValues = {
  registrationNumber: "",
  company: "",
  make: "",
  model: "",
  variant: "",
  photoUrl: undefined,
  year: new Date().getFullYear(),
  colour: "",
  fuelType: "petrol",
  departmentCostCentre: "",
  expectedFuelAverageKmpl: 12,
  currentOdometer: 0,
  seatingCapacity: undefined,
  transmission: undefined,
  driveType: "",
  bodyType: "",
  fuelAverageAlertLow: undefined,
  fuelAverageAlertHigh: undefined,
  oilChangeKm: undefined,
  tyreChangeKm: undefined,
  fuelFilterChangeKm: undefined,
  gearOilChangeKm: undefined,
  timingBeltChangeKm: undefined,
};

// photoUrl stays undefined here for the same reason as DriverFormDialog: it
// only ever accepts a fresh base64 capture, never the record's existing
// https:// photo URL. PhotoCapture shows that via `initialPreviewUrl` instead.
function vehicleToFormValues(vehicle: Vehicle): FormValues {
  return {
    registrationNumber: vehicle.registrationNumber,
    company: vehicle.company,
    make: vehicle.make,
    model: vehicle.model,
    variant: vehicle.variant ?? "",
    photoUrl: undefined,
    year: vehicle.year,
    colour: vehicle.colour,
    fuelType: vehicle.fuelType,
    departmentCostCentre: vehicle.departmentCostCentre ?? "",
    expectedFuelAverageKmpl: vehicle.expectedFuelAverageKmpl,
    currentOdometer: vehicle.currentOdometer,
    // These numeric fields are null=True on the backend (not blank=True
    // strings), so an unset value comes back as JSON `null`, not `""` — and
    // zod's number().optional() only accepts `undefined`, rejecting `null`
    // outright. Same silent-failure class as transmission below and
    // DriverFormDialog's gender field, just the null-vs-empty-string variant.
    seatingCapacity: vehicle.seatingCapacity ?? undefined,
    // The backend stores an unset transmission as "" (CharField default), not
    // null/absent — zod's enum().optional() only accepts a real `undefined`,
    // so "" must be coerced here or validation fails silently (same class of
    // bug as DriverFormDialog's gender field).
    transmission: vehicle.transmission || undefined,
    driveType: vehicle.driveType ?? "",
    bodyType: vehicle.bodyType ?? "",
    fuelAverageAlertLow: vehicle.fuelAverageAlertLow ?? undefined,
    fuelAverageAlertHigh: vehicle.fuelAverageAlertHigh ?? undefined,
    oilChangeKm: vehicle.oilChangeKm ?? undefined,
    tyreChangeKm: vehicle.tyreChangeKm ?? undefined,
    fuelFilterChangeKm: vehicle.fuelFilterChangeKm ?? undefined,
    gearOilChangeKm: vehicle.gearOilChangeKm ?? undefined,
    timingBeltChangeKm: vehicle.timingBeltChangeKm ?? undefined,
  };
}

interface VehicleFormDialogProps {
  mode: "add" | "edit";
  /** Required when mode === "edit". */
  vehicle?: Vehicle;
}

/** Add/Edit Vehicle — one dialog for both. Used from the Vehicles list page
 * (add) and the Vehicle profile page (edit). */
export function VehicleFormDialog({ mode, vehicle }: VehicleFormDialogProps) {
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const [open, setOpen] = useState(false);
  const { containerRef, activeId } = useFormModalScrollSpy(VEHICLE_SECTIONS);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: mode === "edit" && vehicle ? vehicleToFormValues(vehicle) : emptyDefaults,
  });

  const isPending = createVehicle.isPending || updateVehicle.isPending;

  function handleOpenChange(next: boolean) {
    // Radix routes Escape, outside-click and the X button all through here, so
    // this one guard keeps the dialog from being dismissed mid-save.
    if (!next && isPending) return;
    if (next) {
      form.reset(mode === "edit" && vehicle ? vehicleToFormValues(vehicle) : emptyDefaults);
    }
    setOpen(next);
  }

  async function onSubmit(values: FormValues) {
    try {
      if (mode === "edit" && vehicle) {
        await updateVehicle.mutateAsync({ id: vehicle.id, patch: values });
        toast.success(`${values.registrationNumber} updated.`);
      } else {
        await createVehicle.mutateAsync(values);
        toast.success(`${values.registrationNumber} added to the fleet.`);
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${mode === "edit" ? "update" : "add"} vehicle.`);
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
            <Plus className="h-4 w-4" /> Add Vehicle
          </Button>
        )}
      </DialogTrigger>
      <FullScreenDialogContent>
        <FormModalHeader
          icon={Car}
          title={mode === "edit" ? "Edit Vehicle" : "Add Vehicle"}
          description={
            mode === "edit"
              ? "Update this vehicle's details and operating defaults."
              : "Register a new vehicle and set its operating defaults."
          }
        />
        <div className="flex flex-1 overflow-hidden">
          <FormModalNav sections={VEHICLE_SECTIONS} activeId={activeId} />
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
            {/* `contents` keeps the flex layout intact while the disabled
                fieldset locks every control inside during a save. */}
            <fieldset disabled={isPending} className="contents">
            <FormModalBody containerRef={containerRef}>
              <FormSection
                id="identity"
                icon={Car}
                title="Identity & Registration"
                description="Core identity fields used across the fleet."
              >
                <PhotoCapture
                  label="Vehicle Photo"
                  initialPreviewUrl={vehicle?.photoUrl}
                  onCapture={async (file) => form.setValue("photoUrl", await fileToDataUrl(file))}
                />
                <FormField label="Registration Number" error={form.formState.errors.registrationNumber?.message}>
                  <Input {...form.register("registrationNumber")} placeholder="e.g. LEA-1234" />
                </FormField>
                <FormField label="Company" error={form.formState.errors.company?.message}>
                  <Input {...form.register("company")} placeholder="e.g. Head Office" />
                </FormField>
                <FormField label="Make" error={form.formState.errors.make?.message}>
                  <Input {...form.register("make")} placeholder="e.g. Toyota" />
                </FormField>
                <FormField label="Model" error={form.formState.errors.model?.message}>
                  <Input {...form.register("model")} placeholder="e.g. Hilux" />
                </FormField>
                <FormField label="Variant (optional)">
                  <Input {...form.register("variant")} placeholder="e.g. Revo" />
                </FormField>
                <FormField label="Year" error={form.formState.errors.year?.message}>
                  <Input type="number" {...form.register("year", { valueAsNumber: true })} />
                </FormField>
                <FormField label="Colour" error={form.formState.errors.colour?.message}>
                  <Input {...form.register("colour")} placeholder="e.g. White" />
                </FormField>
              </FormSection>

              <FormSection
                id="specifications"
                icon={Settings2}
                title="Specifications"
                description="Physical and mechanical attributes."
              >
                <FormField label="Fuel Type" error={form.formState.errors.fuelType?.message}>
                  <Select
                    value={form.watch("fuelType")}
                    onValueChange={(v) => form.setValue("fuelType", v as Vehicle["fuelType"], { shouldValidate: true })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select fuel type" />
                    </SelectTrigger>
                    <SelectContent>
                      {FUEL_TYPES.map((f) => (
                        <SelectItem key={f} value={f} className="capitalize">
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Transmission (optional)">
                  <Select
                    value={form.watch("transmission")}
                    onValueChange={(v) => form.setValue("transmission", v as FormValues["transmission"])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select transmission" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSMISSIONS.map((t) => (
                        <SelectItem key={t} value={t} className="capitalize">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Drive Type (optional)">
                  <Input {...form.register("driveType")} placeholder="e.g. 4x4" />
                </FormField>
                <FormField label="Body Type (optional)">
                  <Input {...form.register("bodyType")} placeholder="e.g. Double Cabin" />
                </FormField>
                <FormField label="Seating Capacity (optional)">
                  <Input type="number" {...form.register("seatingCapacity", { setValueAs: emptyToUndefined })} />
                </FormField>
              </FormSection>

              <FormSection
                id="operations"
                icon={Building2}
                title="Operations"
                description="Assignment and day-to-day tracking defaults."
              >
                <FormField label="Department / Cost Centre (optional)">
                  <Input {...form.register("departmentCostCentre")} placeholder="e.g. Sales" />
                </FormField>
                <FormField
                  label="Expected Fuel Average (KM/L)"
                  error={form.formState.errors.expectedFuelAverageKmpl?.message}
                >
                  <Input type="number" step="0.1" {...form.register("expectedFuelAverageKmpl", { valueAsNumber: true })} />
                </FormField>
                <FormField label="Current Odometer (KM)" error={form.formState.errors.currentOdometer?.message}>
                  <Input type="number" {...form.register("currentOdometer", { valueAsNumber: true })} />
                </FormField>
              </FormSection>

              <FormSection
                id="alerts"
                icon={Gauge}
                title="Fuel Average Alert Thresholds"
                description="Get notified when fuel efficiency drifts outside range (KM/L)."
              >
                <FormField label="Alert if average drops below">
                  <Input type="number" step="0.1" {...form.register("fuelAverageAlertLow", { setValueAs: emptyToUndefined })} />
                </FormField>
                <FormField label="Alert if average rises above">
                  <Input type="number" step="0.1" {...form.register("fuelAverageAlertHigh", { setValueAs: emptyToUndefined })} />
                </FormField>
              </FormSection>

              <FormSection
                id="maintenance"
                icon={Wrench}
                title="Standard Consumable Replacement"
                description="Distance-based service reminders, in KM."
              >
                <FormField label="Oil Change Every">
                  <Input type="number" {...form.register("oilChangeKm", { setValueAs: emptyToUndefined })} />
                </FormField>
                <FormField label="Tyre Change Due After">
                  <Input type="number" {...form.register("tyreChangeKm", { setValueAs: emptyToUndefined })} />
                </FormField>
                <FormField label="Fuel Filter Change After">
                  <Input type="number" {...form.register("fuelFilterChangeKm", { setValueAs: emptyToUndefined })} />
                </FormField>
                <FormField label="Gear Oil Change After">
                  <Input type="number" {...form.register("gearOilChangeKm", { setValueAs: emptyToUndefined })} />
                </FormField>
                <FormField label="Timing Belt Change After">
                  <Input type="number" {...form.register("timingBeltChangeKm", { setValueAs: emptyToUndefined })} />
                </FormField>
              </FormSection>
            </FormModalBody>

            <FormModalFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPending ? "Saving…" : mode === "edit" ? "Save Changes" : "Add Vehicle"}
              </Button>
            </FormModalFooter>
            </fieldset>
          </form>
        </div>
      </FullScreenDialogContent>
    </Dialog>
  );
}
