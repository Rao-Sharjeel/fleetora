import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MasterListPage } from "@/features/master-data/components/master-list-page";
import { useMasterCollection } from "@/features/master-data/hooks";
import type { GateMaster } from "@/types";

const schema = z.object({
  code: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  locationId: z.string().min(1, "Required"),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function GatePage() {
  const { data: locations = [] } = useMasterCollection("locationSites");
  const locationName = (id: string) => locations.find((l) => l.id === id)?.name ?? id;

  const columns: ColumnDef<GateMaster>[] = [
    { accessorKey: "code", header: "Code" },
    { accessorKey: "name", header: "Gate Name" },
    { id: "location", header: "Location / Site", cell: ({ row }) => locationName(row.original.locationId) },
    { accessorKey: "description", header: "Description" },
  ];

  return (
    <MasterListPage<"gates", GateMaster, FormValues>
      masterKey="gates"
      title="Gate Setup"
      description="Manage gates / entry points in each location."
      columns={columns}
      schema={schema}
      defaultValues={{ code: "", name: "", locationId: "", description: "" }}
      addLabel="Add Gate"
      renderFields={(form) => (
        <>
          <FormField label="Code" error={form.formState.errors.code?.message}>
            <Input {...form.register("code")} placeholder="e.g. GATE-06" />
          </FormField>
          <FormField label="Gate Name" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} placeholder="e.g. Rear Gate" />
          </FormField>
          <FormField label="Location / Site" error={form.formState.errors.locationId?.message}>
            <Select
              defaultValue={form.getValues("locationId")}
              onValueChange={(v) => form.setValue("locationId", v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
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
