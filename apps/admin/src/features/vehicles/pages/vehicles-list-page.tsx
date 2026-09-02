import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, QrCode } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { useCreateVehicle, useVehicles } from "@/features/vehicles/hooks";
import type { Vehicle } from "@/types";
import { formatKm } from "@/lib/formatters";
import { printVehicleQrLabel } from "@/lib/qr-print";

const FUEL_TYPES: Vehicle["fuelType"][] = ["petrol", "diesel", "other"];
const TRANSMISSIONS: NonNullable<Vehicle["transmission"]>[] = ["manual", "automatic"];

const schema = z.object({
  registrationNumber: z.string().min(1, "Required"),
  company: z.string().min(1, "Required"),
  make: z.string().min(1, "Required"),
  model: z.string().min(1, "Required"),
  variant: z.string().optional(),
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

const columns: ColumnDef<Vehicle>[] = [
  { accessorKey: "internalId", header: "ID" },
  { accessorKey: "registrationNumber", header: "Registration" },
  {
    id: "vehicle",
    header: "Vehicle",
    cell: ({ row }) =>
      `${row.original.make} ${row.original.model}${row.original.variant ? ` ${row.original.variant}` : ""}`,
  },
  { accessorKey: "departmentCostCentre", header: "Department" },
  {
    accessorKey: "currentOdometer",
    header: "Odometer",
    cell: ({ getValue }) => formatKm(getValue<number>()),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => <StatusBadge status={getValue<Vehicle["status"]>()} />,
  },
  {
    id: "qr",
    header: "",
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Print QR label"
        onClick={(e) => {
          e.stopPropagation();
          printVehicleQrLabel(row.original.registrationNumber, row.original.qrCode);
        }}
      >
        <QrCode className="h-4 w-4" />
      </Button>
    ),
  },
];

export function VehiclesListPage() {
  const { data: vehicles = [], isLoading } = useVehicles();
  const navigate = useNavigate();
  const createVehicle = useCreateVehicle();
  const [open, setOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      registrationNumber: "",
      company: "",
      make: "",
      model: "",
      variant: "",
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
    },
  });

  async function onSubmit(values: FormValues) {
    await createVehicle.mutateAsync(values);
    toast.success(`${values.registrationNumber} added to the fleet.`);
    form.reset();
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Vehicle Master"
        description="All registered vehicles and their live status. Click a row to open its profile."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Vehicle</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
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
                  <FormField label="Fuel Type" error={form.formState.errors.fuelType?.message}>
                    <Select
                      defaultValue={form.getValues("fuelType")}
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
                  <FormField label="Seating Capacity (optional)">
                    <Input type="number" {...form.register("seatingCapacity", { valueAsNumber: true })} />
                  </FormField>
                  <FormField label="Transmission (optional)">
                    <Select
                      defaultValue={form.getValues("transmission")}
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
                </div>

                <Separator />
                <p className="text-sm font-medium text-muted-foreground">Fuel Average Alert Thresholds (KM/L)</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Alert if average drops below">
                    <Input type="number" step="0.1" {...form.register("fuelAverageAlertLow", { valueAsNumber: true })} />
                  </FormField>
                  <FormField label="Alert if average rises above">
                    <Input type="number" step="0.1" {...form.register("fuelAverageAlertHigh", { valueAsNumber: true })} />
                  </FormField>
                </div>

                <Separator />
                <p className="text-sm font-medium text-muted-foreground">Standard Consumable Replacement (KM)</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Oil Change Every">
                    <Input type="number" {...form.register("oilChangeKm", { valueAsNumber: true })} />
                  </FormField>
                  <FormField label="Tyre Change Due After">
                    <Input type="number" {...form.register("tyreChangeKm", { valueAsNumber: true })} />
                  </FormField>
                  <FormField label="Fuel Filter Change After">
                    <Input type="number" {...form.register("fuelFilterChangeKm", { valueAsNumber: true })} />
                  </FormField>
                  <FormField label="Gear Oil Change After">
                    <Input type="number" {...form.register("gearOilChangeKm", { valueAsNumber: true })} />
                  </FormField>
                  <FormField label="Timing Belt Change After">
                    <Input type="number" {...form.register("timingBeltChangeKm", { valueAsNumber: true })} />
                  </FormField>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createVehicle.isPending}>
                    Add Vehicle
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading vehicles…</p>
      ) : (
        <DataTable
          columns={columns}
          data={vehicles}
          searchPlaceholder="Search by registration, make or department…"
          onRowClick={(vehicle) => navigate(`/vehicles/${vehicle.id}`)}
        />
      )}
    </div>
  );
}
