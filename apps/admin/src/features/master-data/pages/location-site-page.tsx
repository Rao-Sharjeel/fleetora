import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { MasterListPage } from "@/features/master-data/components/master-list-page";
import type { LocationSiteMaster } from "@/types";

const schema = z.object({
  code: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  address: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const columns: ColumnDef<LocationSiteMaster>[] = [
  { accessorKey: "code", header: "Code" },
  { accessorKey: "name", header: "Location / Site" },
  { accessorKey: "address", header: "Address" },
];

export function LocationSitePage() {
  return (
    <MasterListPage<"locationSites", LocationSiteMaster, FormValues>
      masterKey="locationSites"
      title="Location / Site Setup"
      description="Manage locations / sites of the organization."
      columns={columns}
      schema={schema}
      defaultValues={{ code: "", name: "", address: "" }}
      addLabel="Add Location"
      renderFields={(form) => (
        <>
          <FormField label="Code" error={form.formState.errors.code?.message}>
            <Input {...form.register("code")} placeholder="e.g. LOC-06" />
          </FormField>
          <FormField label="Location / Site Name" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} placeholder="e.g. Branch Office - Faisalabad" />
          </FormField>
          <FormField label="Address">
            <Input {...form.register("address")} placeholder="Optional" />
          </FormField>
        </>
      )}
    />
  );
}
