import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlanTrip, useUpdateTripPlan } from "@/features/trips/hooks";
import { useVehicles } from "@/features/vehicles/hooks";
import { useDrivers } from "@/features/drivers/hooks";
import { useMasterCollection } from "@/features/master-data/hooks";
import type { Trip } from "@/types";

const schema = z.object({
  vehicleId: z.string().min(1, "Required"),
  driverId: z.string().min(1, "Required"),
  purpose: z.string().min(1, "Required"),
  destination: z.string().min(1, "Required"),
  requestedBy: z.string().min(1, "Required"),
  department: z.string().min(1, "Required"),
  plannedOutTime: z.string().min(1, "Required"),
  expectedReturn: z.string().optional(),
  remarks: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = {
  vehicleId: "",
  driverId: "",
  purpose: "",
  destination: "",
  requestedBy: "",
  department: "",
  plannedOutTime: "",
  expectedReturn: "",
  remarks: "",
};

// <input type="datetime-local"> and Django's DateTimeField ISO string differ
// only by the trailing seconds/offset — trimming to the shared prefix round-trips
// cleanly through both, matching the pattern already used by Requisitions.
function tripToFormValues(trip: Trip): FormValues {
  return {
    vehicleId: trip.vehicleId,
    driverId: trip.driverId,
    purpose: trip.purpose,
    destination: trip.destination,
    requestedBy: trip.requestedBy,
    department: trip.department,
    plannedOutTime: trip.plannedOutTime ? trip.plannedOutTime.slice(0, 16) : "",
    expectedReturn: trip.expectedReturn ? trip.expectedReturn.slice(0, 16) : "",
    remarks: trip.remarks ?? "",
  };
}

interface TripPlanDialogProps {
  mode: "add" | "edit";
  trip?: Trip;
}

/** Plan a trip — the Transport Incharge authorizing a vehicle+driver+purpose
 * before anyone reaches the gate. The gate later only ever confirms this;
 * nothing here is decided at the exit any more. See fleet.serializers.TripPlanSerializer. */
export function TripPlanDialog({ mode, trip }: TripPlanDialogProps) {
  const [open, setOpen] = useState(false);
  const { data: vehicles = [] } = useVehicles();
  const { data: drivers = [] } = useDrivers();
  const { data: purposes = [] } = useMasterCollection("vehiclePurposes");
  const { data: departments = [] } = useMasterCollection("departmentMasters");
  const planTrip = usePlanTrip();
  const updateTripPlan = useUpdateTripPlan();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: trip ? tripToFormValues(trip) : defaultValues,
  });

  useEffect(() => {
    if (open) form.reset(trip ? tripToFormValues(trip) : defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      plannedOutTime: new Date(values.plannedOutTime).toISOString(),
      expectedReturn: values.expectedReturn ? new Date(values.expectedReturn).toISOString() : undefined,
    };
    try {
      if (mode === "edit" && trip) {
        await updateTripPlan.mutateAsync({ id: trip.id, patch: payload });
        toast.success(`${trip.tripNumber} updated.`);
      } else {
        const created = await planTrip.mutateAsync(payload);
        toast.success(`${created.tripNumber} planned.`);
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save the plan.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "edit" ? (
          <Button variant="ghost" size="icon" aria-label="Edit plan">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" /> Plan Trip
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? `Edit ${trip?.tripNumber}` : "Plan a Trip"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Vehicle" error={form.formState.errors.vehicleId?.message}>
              <Select value={form.watch("vehicleId")} onValueChange={(v) => form.setValue("vehicleId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.registrationNumber} · {v.make} {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Driver" error={form.formState.errors.driverId?.message}>
              <Select value={form.watch("driverId")} onValueChange={(v) => form.setValue("driverId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} ({d.employeeId})
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
              <Input {...form.register("destination")} placeholder="e.g. Shah Alam" />
            </FormField>
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
            <FormField label="Planned Departure" error={form.formState.errors.plannedOutTime?.message}>
              <Input type="datetime-local" {...form.register("plannedOutTime")} />
            </FormField>
            <FormField label="Expected Return (optional)">
              <Input type="datetime-local" {...form.register("expectedReturn")} />
            </FormField>
            <FormField label="Remarks (optional)">
              <Input {...form.register("remarks")} />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="submit" loading={planTrip.isPending || updateTripPlan.isPending} loadingText="Saving…">
              {mode === "edit" ? "Save Changes" : "Plan Trip"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
