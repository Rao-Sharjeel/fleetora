import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { MasterListPage } from "@/features/master-data/components/master-list-page";
import type { VehicleMakeMaster } from "@/types";

const schema = z.object({
  code: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  country: z.string().optional(),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const columns: ColumnDef<VehicleMakeMaster>[] = [
  { accessorKey: "code", header: "Code" },
  { accessorKey: "name", header: "Vehicle Make" },
  { accessorKey: "country", header: "Country / Origin" },
  { accessorKey: "description", header: "Description" },
];

export function VehicleMakePage() {
  return (
    <MasterListPage<"vehicleMakes", VehicleMakeMaster, FormValues>
      masterKey="vehicleMakes"
      title="Vehicle Make Setup"
      description="Maintain vehicle manufacturers for standardized vehicle entry."
      columns={columns}
      schema={schema}
      defaultValues={{ code: "", name: "", country: "", description: "" }}
      addLabel="Add Vehicle Make"
      renderFields={(form) => (
        <>
          <FormField label="Code" error={form.formState.errors.code?.message}>
            <Input {...form.register("code")} placeholder="e.g. MAKE-07" />
          </FormField>
          <FormField label="Vehicle Make" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} placeholder="e.g. Kia" />
          </FormField>
          <FormField label="Country / Origin">
            <Input {...form.register("country")} placeholder="Optional" />
          </FormField>
          <FormField label="Description">
            <Input {...form.register("description")} placeholder="Optional" />
          </FormField>
        </>
      )}
    />
  );
}
