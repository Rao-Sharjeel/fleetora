import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MasterListPage } from "@/features/master-data/components/master-list-page";
import type { VehiclePurposeMaster } from "@/types";

const USE_TYPES = ["Official", "Personal"] as const;

const schema = z.object({
  code: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  useType: z.enum(USE_TYPES),
  approvalLevel: z.string().min(1, "Required"),
});
type FormValues = z.infer<typeof schema>;

const columns: ColumnDef<VehiclePurposeMaster>[] = [
  { accessorKey: "code", header: "Code" },
  { accessorKey: "name", header: "Vehicle Purpose" },
  { accessorKey: "useType", header: "Use Type" },
  { accessorKey: "approvalLevel", header: "Approval Level" },
];

export function VehiclePurposePage() {
  return (
    <MasterListPage<"vehiclePurposes", VehiclePurposeMaster, FormValues>
      masterKey="vehiclePurposes"
      title="Vehicle Purpose Setup"
      description="Standardize approved reasons for vehicle requisitions and trips."
      columns={columns}
      schema={schema}
      defaultValues={{ code: "", name: "", useType: "Official", approvalLevel: "" }}
      addLabel="Add Purpose"
      renderFields={(form) => (
        <>
          <FormField label="Code" error={form.formState.errors.code?.message}>
            <Input {...form.register("code")} placeholder="e.g. PUR-08" />
          </FormField>
          <FormField label="Purpose Name" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} placeholder="e.g. Airport Pickup" />
          </FormField>
          <FormField label="Use Type" error={form.formState.errors.useType?.message}>
            <Select
              defaultValue={form.getValues("useType")}
              onValueChange={(v) => form.setValue("useType", v as FormValues["useType"], { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select use type" />
              </SelectTrigger>
              <SelectContent>
                {USE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Approval Level" error={form.formState.errors.approvalLevel?.message}>
            <Input {...form.register("approvalLevel")} placeholder="e.g. Department Head" />
          </FormField>
        </>
      )}
    />
  );
}
