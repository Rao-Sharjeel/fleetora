import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MasterListPage } from "@/features/master-data/components/master-list-page";
import { useMasterCollection } from "@/features/master-data/hooks";
import type { CostCenterMaster } from "@/types";

const schema = z.object({
  code: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  departmentId: z.string().min(1, "Required"),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function CostCenterPage() {
  const { data: departments = [] } = useMasterCollection("departmentMasters");
  const departmentName = (id: string) => departments.find((d) => d.id === id)?.name ?? id;

  const columns: ColumnDef<CostCenterMaster>[] = [
    { accessorKey: "code", header: "Code" },
    { accessorKey: "name", header: "Cost Center Name" },
    { id: "department", header: "Department", cell: ({ row }) => departmentName(row.original.departmentId) },
    { accessorKey: "description", header: "Description" },
  ];

  return (
    <MasterListPage<"costCenters", CostCenterMaster, FormValues>
      masterKey="costCenters"
      title="Cost Center Setup"
      description="Allocate fleet costs to departments, projects or operating units."
      columns={columns}
      schema={schema}
      defaultValues={{ code: "", name: "", departmentId: "", description: "" }}
      addLabel="Add Cost Center"
      renderFields={(form) => (
        <>
          <FormField label="Cost Center Code" error={form.formState.errors.code?.message}>
            <Input {...form.register("code")} placeholder="e.g. CC-007" />
          </FormField>
          <FormField label="Cost Center Name" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} placeholder="Enter name" />
          </FormField>
          <FormField label="Department" error={form.formState.errors.departmentId?.message}>
            <Select
              defaultValue={form.getValues("departmentId")}
              onValueChange={(v) => form.setValue("departmentId", v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Description">
            <Input {...form.register("description")} placeholder="Optional" />
          </FormField>
        </>
      )}
    />
  );
}
