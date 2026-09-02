import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MasterListPage } from "@/features/master-data/components/master-list-page";
import type { EngineOilMaster } from "@/types";

const OIL_TYPES = ["Synthetic", "Semi Synthetic", "Mineral"] as const;

const schema = z.object({
  code: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  brand: z.string().min(1, "Required"),
  grade: z.string().min(1, "Required"),
  oilType: z.enum(OIL_TYPES),
  packSize: z.string().min(1, "Required"),
  defaultKm: z.number().min(0, "Must be 0 or greater"),
});
type FormValues = z.infer<typeof schema>;

const columns: ColumnDef<EngineOilMaster>[] = [
  { accessorKey: "code", header: "Code" },
  { accessorKey: "brand", header: "Brand" },
  { accessorKey: "grade", header: "Grade / Viscosity" },
  { accessorKey: "oilType", header: "Oil Type" },
  { accessorKey: "packSize", header: "Pack Size" },
  { accessorKey: "defaultKm", header: "Default KM" },
];

export function EngineOilPage() {
  return (
    <MasterListPage<"engineOils", EngineOilMaster, FormValues>
      masterKey="engineOils"
      title="Engine Oil Setup"
      description="Maintain approved engine oils and recommended default intervals."
      columns={columns}
      schema={schema}
      defaultValues={{ code: "", name: "", brand: "", grade: "", oilType: "Synthetic", packSize: "4 Ltr", defaultKm: 5000 }}
      addLabel="Add Engine Oil"
      renderFields={(form) => (
        <>
          <FormField label="Code" error={form.formState.errors.code?.message}>
            <Input {...form.register("code")} placeholder="e.g. OIL-06" />
          </FormField>
          <FormField label="Display Name" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} placeholder="e.g. Shell 5W-30" />
          </FormField>
          <FormField label="Brand / Manufacturer" error={form.formState.errors.brand?.message}>
            <Input {...form.register("brand")} placeholder="e.g. Shell" />
          </FormField>
          <FormField label="Grade / Viscosity" error={form.formState.errors.grade?.message}>
            <Input {...form.register("grade")} placeholder="e.g. 5W-30" />
          </FormField>
          <FormField label="Oil Type" error={form.formState.errors.oilType?.message}>
            <Select
              defaultValue={form.getValues("oilType")}
              onValueChange={(v) => form.setValue("oilType", v as FormValues["oilType"], { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select oil type" />
              </SelectTrigger>
              <SelectContent>
                {OIL_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Pack Size" error={form.formState.errors.packSize?.message}>
            <Input {...form.register("packSize")} placeholder="e.g. 4 Ltr" />
          </FormField>
          <FormField label="Recommended KM" error={form.formState.errors.defaultKm?.message}>
            <Input type="number" {...form.register("defaultKm", { valueAsNumber: true })} />
          </FormField>
        </>
      )}
    />
  );
}
