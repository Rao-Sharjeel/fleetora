import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { MasterListPage } from "@/features/master-data/components/master-list-page";
import type { PartConsumableMaster } from "@/types";

const schema = z.object({
  code: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  category: z.string().min(1, "Required"),
  unit: z.string().min(1, "Required"),
  defaultLifeKm: z.number().min(0, "Must be 0 or greater").optional(),
});
type FormValues = z.infer<typeof schema>;

const columns: ColumnDef<PartConsumableMaster>[] = [
  { accessorKey: "code", header: "Code" },
  { accessorKey: "name", header: "Part / Consumable" },
  { accessorKey: "category", header: "Category" },
  { accessorKey: "unit", header: "Unit" },
  { accessorKey: "defaultLifeKm", header: "Default Life KM" },
];

export function PartsConsumablePage() {
  return (
    <MasterListPage<"partsConsumables", PartConsumableMaster, FormValues>
      masterKey="partsConsumables"
      title="Parts / Consumables Setup"
      description="Maintain reusable parts and consumables for vehicle maintenance."
      columns={columns}
      schema={schema}
      defaultValues={{ code: "", name: "", category: "", unit: "Nos.", defaultLifeKm: undefined }}
      addLabel="Add Part / Consumable"
      renderFields={(form) => (
        <>
          <FormField label="Code" error={form.formState.errors.code?.message}>
            <Input {...form.register("code")} placeholder="e.g. PRT-08" />
          </FormField>
          <FormField label="Part / Consumable Name" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} placeholder="e.g. Battery" />
          </FormField>
          <FormField label="Category" error={form.formState.errors.category?.message}>
            <Input {...form.register("category")} placeholder="e.g. Filter" />
          </FormField>
          <FormField label="Unit of Measure" error={form.formState.errors.unit?.message}>
            <Input {...form.register("unit")} placeholder="Nos. / Set / Ltr" />
          </FormField>
          <FormField label="Default Life KM">
            <Input type="number" {...form.register("defaultLifeKm", { valueAsNumber: true })} placeholder="Optional" />
          </FormField>
        </>
      )}
    />
  );
}
