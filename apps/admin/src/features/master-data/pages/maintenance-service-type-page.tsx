import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MasterListPage } from "@/features/master-data/components/master-list-page";
import type { MaintenanceServiceTypeMaster } from "@/types";

const BASIS_OPTIONS = ["Mileage", "Time", "Mileage / Time"] as const;

const schema = z.object({
  code: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  category: z.string().min(1, "Required"),
  defaultBasis: z.enum(BASIS_OPTIONS),
});
type FormValues = z.infer<typeof schema>;

const columns: ColumnDef<MaintenanceServiceTypeMaster>[] = [
  { accessorKey: "code", header: "Code" },
  { accessorKey: "name", header: "Service Type" },
  { accessorKey: "category", header: "Category" },
  { accessorKey: "defaultBasis", header: "Default Basis" },
];

export function MaintenanceServiceTypePage() {
  return (
    <MasterListPage<"maintenanceServiceTypes", MaintenanceServiceTypeMaster, FormValues>
      masterKey="maintenanceServiceTypes"
      title="Maintenance Service Type Setup"
      description="Define maintenance activities used in schedules, entries and alerts."
      columns={columns}
      schema={schema}
      defaultValues={{ code: "", name: "", category: "", defaultBasis: "Mileage" }}
      addLabel="Add Service Type"
      renderFields={(form) => (
        <>
          <FormField label="Code" error={form.formState.errors.code?.message}>
            <Input {...form.register("code")} placeholder="e.g. MST-11" />
          </FormField>
          <FormField label="Service Type" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} placeholder="e.g. AC Service" />
          </FormField>
          <FormField label="Category" error={form.formState.errors.category?.message}>
            <Input {...form.register("category")} placeholder="Engine / Tyre / Brake etc." />
          </FormField>
          <FormField label="Default Basis" error={form.formState.errors.defaultBasis?.message}>
            <Select
              defaultValue={form.getValues("defaultBasis")}
              onValueChange={(v) => form.setValue("defaultBasis", v as FormValues["defaultBasis"], { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select basis" />
              </SelectTrigger>
              <SelectContent>
                {BASIS_OPTIONS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </>
      )}
    />
  );
}
