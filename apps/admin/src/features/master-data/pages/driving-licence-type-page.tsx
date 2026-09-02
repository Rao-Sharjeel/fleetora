import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { MasterListPage } from "@/features/master-data/components/master-list-page";
import type { DrivingLicenceTypeMaster } from "@/types";

const schema = z.object({
  code: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  description: z.string().optional(),
  defaultValidityYears: z.number().min(0, "Must be 0 or greater").optional(),
});
type FormValues = z.infer<typeof schema>;

const columns: ColumnDef<DrivingLicenceTypeMaster>[] = [
  { accessorKey: "code", header: "Code" },
  { accessorKey: "name", header: "Licence Type" },
  { accessorKey: "description", header: "Description" },
  { accessorKey: "defaultValidityYears", header: "Validity (Years)" },
];

export function DrivingLicenceTypePage() {
  return (
    <MasterListPage<"drivingLicenceTypes", DrivingLicenceTypeMaster, FormValues>
      masterKey="drivingLicenceTypes"
      title="Driving Licence Type Setup"
      description="Manage all driving licence types used in driver setup."
      columns={columns}
      schema={schema}
      defaultValues={{ code: "", name: "", description: "", defaultValidityYears: 5 }}
      addLabel="Add Licence Type"
      renderFields={(form) => (
        <>
          <FormField label="Licence Type Code" error={form.formState.errors.code?.message}>
            <Input {...form.register("code")} placeholder="e.g. DLT-07" />
          </FormField>
          <FormField label="Licence Type Name" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} placeholder="e.g. Trailer" />
          </FormField>
          <FormField label="Description">
            <Input {...form.register("description")} placeholder="Optional description" />
          </FormField>
          <FormField label="Default Validity (Years)">
            <Input type="number" {...form.register("defaultValidityYears", { valueAsNumber: true })} />
          </FormField>
        </>
      )}
    />
  );
}
