import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { MasterListPage } from "@/features/master-data/components/master-list-page";
import type { VehicleTypeMaster } from "@/types";

const schema = z.object({
  code: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const columns: ColumnDef<VehicleTypeMaster>[] = [
  { accessorKey: "code", header: "Code" },
  { accessorKey: "name", header: "Vehicle Type" },
  { accessorKey: "description", header: "Description" },
];

export function VehicleTypePage() {
  return (
    <MasterListPage<"vehicleTypes", VehicleTypeMaster, FormValues>
      masterKey="vehicleTypes"
      title="Vehicle Type Setup"
      description="Manage vehicle classifications used throughout the fleet."
      columns={columns}
      schema={schema}
      defaultValues={{ code: "", name: "", description: "" }}
      addLabel="Add Vehicle Type"
      renderFields={(form) => (
        <>
          <FormField label="Code" error={form.formState.errors.code?.message}>
            <Input {...form.register("code")} placeholder="e.g. VT-08" />
          </FormField>
          <FormField label="Vehicle Type Name" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} placeholder="e.g. SUV" />
          </FormField>
          <FormField label="Description" error={form.formState.errors.description?.message}>
            <Input {...form.register("description")} placeholder="Optional description" />
          </FormField>
        </>
      )}
    />
  );
}
