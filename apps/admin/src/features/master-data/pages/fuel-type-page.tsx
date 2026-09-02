import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { MasterListPage } from "@/features/master-data/components/master-list-page";
import type { FuelTypeMaster } from "@/types";

const schema = z.object({
  code: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  unit: z.string().min(1, "Required"),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const columns: ColumnDef<FuelTypeMaster>[] = [
  { accessorKey: "code", header: "Code" },
  { accessorKey: "name", header: "Fuel Type" },
  { accessorKey: "unit", header: "Unit" },
  { accessorKey: "description", header: "Description" },
];

export function FuelTypePage() {
  return (
    <MasterListPage<"fuelTypeMasters", FuelTypeMaster, FormValues>
      masterKey="fuelTypeMasters"
      title="Fuel Type Setup"
      description="Manage all fuel types used in vehicle and fuel filling setup."
      columns={columns}
      schema={schema}
      defaultValues={{ code: "", name: "", unit: "Ltr", description: "" }}
      addLabel="Add Fuel Type"
      renderFields={(form) => (
        <>
          <FormField label="Fuel Type Code" error={form.formState.errors.code?.message}>
            <Input {...form.register("code")} placeholder="e.g. FT-06" />
          </FormField>
          <FormField label="Fuel Type Name" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} placeholder="e.g. LPG" />
          </FormField>
          <FormField label="Unit of Measurement" error={form.formState.errors.unit?.message}>
            <Input {...form.register("unit")} placeholder="e.g. Ltr / KG / kWh" />
          </FormField>
          <FormField label="Description">
            <Input {...form.register("description")} placeholder="Optional" />
          </FormField>
        </>
      )}
    />
  );
}
