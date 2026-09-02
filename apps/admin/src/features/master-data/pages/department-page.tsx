import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { MasterListPage } from "@/features/master-data/components/master-list-page";
import type { DepartmentMaster } from "@/types";

const schema = z.object({
  code: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const columns: ColumnDef<DepartmentMaster>[] = [
  { accessorKey: "code", header: "Code" },
  { accessorKey: "name", header: "Department Name" },
  { accessorKey: "description", header: "Description" },
];

export function DepartmentPage() {
  return (
    <MasterListPage<"departmentMasters", DepartmentMaster, FormValues>
      masterKey="departmentMasters"
      title="Department Setup"
      description="Manage departments used for vehicles, drivers and requisitions."
      columns={columns}
      schema={schema}
      defaultValues={{ code: "", name: "", description: "" }}
      addLabel="Add Department"
      renderFields={(form) => (
        <>
          <FormField label="Code" error={form.formState.errors.code?.message}>
            <Input {...form.register("code")} placeholder="e.g. DEPT-08" />
          </FormField>
          <FormField label="Department Name" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} placeholder="e.g. Quality Assurance" />
          </FormField>
          <FormField label="Description">
            <Input {...form.register("description")} placeholder="Optional" />
          </FormField>
        </>
      )}
    />
  );
}
