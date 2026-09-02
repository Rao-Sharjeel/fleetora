import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { MasterListPage } from "@/features/master-data/components/master-list-page";
import type { DocumentTypeMaster } from "@/types";

const schema = z.object({
  code: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  category: z.string().min(1, "Required"),
  defaultAlertDays: z.number().min(0, "Must be 0 or greater").optional(),
  mandatory: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

const columns: ColumnDef<DocumentTypeMaster>[] = [
  { accessorKey: "code", header: "Code" },
  { accessorKey: "name", header: "Document Type" },
  { accessorKey: "category", header: "Category" },
  { accessorKey: "defaultAlertDays", header: "Alert Before (Days)" },
  {
    accessorKey: "mandatory",
    header: "Mandatory",
    cell: ({ getValue }) => (
      <Badge variant={getValue<boolean>() ? "success" : "muted"} dot={false}>
        {getValue<boolean>() ? "Yes" : "No"}
      </Badge>
    ),
  },
];

export function DocumentTypePage() {
  return (
    <MasterListPage<"documentTypes", DocumentTypeMaster, FormValues>
      masterKey="documentTypes"
      title="Document Type Setup"
      description="Manage document types used for vehicles and drivers."
      columns={columns}
      schema={schema}
      defaultValues={{ code: "", name: "", category: "Vehicle Document", defaultAlertDays: 30, mandatory: false }}
      addLabel="Add Document Type"
      renderFields={(form) => (
        <>
          <FormField label="Document Type Code" error={form.formState.errors.code?.message}>
            <Input {...form.register("code")} placeholder="e.g. DOC-11" />
          </FormField>
          <FormField label="Document Type Name" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} placeholder="e.g. Insurance Certificate" />
          </FormField>
          <FormField label="Category" error={form.formState.errors.category?.message}>
            <Input {...form.register("category")} placeholder="Vehicle Document / Driver Document / General" />
          </FormField>
          <FormField label="Default Alert Before (Days)">
            <Input type="number" {...form.register("defaultAlertDays", { valueAsNumber: true })} placeholder="e.g. 30" />
          </FormField>
          <div className="flex items-center gap-2 pt-6">
            <Checkbox
              id="mandatory"
              checked={form.watch("mandatory")}
              onCheckedChange={(v) => form.setValue("mandatory", v === true, { shouldValidate: true })}
            />
            <Label htmlFor="mandatory">Mandatory</Label>
          </div>
        </>
      )}
    />
  );
}
