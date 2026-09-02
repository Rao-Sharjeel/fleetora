import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { MasterListPage } from "@/features/master-data/components/master-list-page";
import type { GearOilTypeMaster } from "@/types";

const schema = z.object({
  code: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const columns: ColumnDef<GearOilTypeMaster>[] = [
  { accessorKey: "code", header: "Code" },
  { accessorKey: "name", header: "Gear Oil Type" },
  { accessorKey: "description", header: "Description" },
];

export function GearOilTypePage() {
  return (
    <MasterListPage<"gearOilTypes", GearOilTypeMaster, FormValues>
      masterKey="gearOilTypes"
      title="Gear Oil Type Setup"
      description="Manage gear oil types used in vehicle maintenance."
      columns={columns}
      schema={schema}
      defaultValues={{ code: "", name: "", description: "" }}
      addLabel="Add Gear Oil Type"
      renderFields={(form) => (
        <>
          <FormField label="Code" error={form.formState.errors.code?.message}>
            <Input {...form.register("code")} placeholder="e.g. GO-04" />
          </FormField>
          <FormField label="Gear Oil Type" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} placeholder="e.g. Hybrid" />
          </FormField>
          <FormField label="Description">
            <Input {...form.register("description")} placeholder="Optional" />
          </FormField>
        </>
      )}
    />
  );
}
