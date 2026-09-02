import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { MasterListPage } from "@/features/master-data/components/master-list-page";
import type { WorkshopVendorMaster } from "@/types";

const schema = z.object({
  code: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  vendorType: z.string().min(1, "Required"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const columns: ColumnDef<WorkshopVendorMaster>[] = [
  { accessorKey: "code", header: "Code" },
  { accessorKey: "name", header: "Vendor / Workshop" },
  { accessorKey: "vendorType", header: "Type" },
  { accessorKey: "contactPerson", header: "Contact Person" },
  { accessorKey: "phone", header: "Phone" },
];

export function WorkshopVendorPage() {
  return (
    <MasterListPage<"workshopVendors", WorkshopVendorMaster, FormValues>
      masterKey="workshopVendors"
      title="Workshop / Vendor Setup"
      description="Maintain approved workshops, dealers and maintenance vendors."
      columns={columns}
      schema={schema}
      defaultValues={{ code: "", name: "", vendorType: "", contactPerson: "", phone: "" }}
      addLabel="Add Vendor"
      renderFields={(form) => (
        <>
          <FormField label="Code" error={form.formState.errors.code?.message}>
            <Input {...form.register("code")} placeholder="e.g. VEN-06" />
          </FormField>
          <FormField label="Vendor / Workshop Name" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} placeholder="Enter name" />
          </FormField>
          <FormField label="Vendor Type" error={form.formState.errors.vendorType?.message}>
            <Input {...form.register("vendorType")} placeholder="Workshop / Dealer / Supplier" />
          </FormField>
          <FormField label="Contact Person">
            <Input {...form.register("contactPerson")} placeholder="Optional" />
          </FormField>
          <FormField label="Phone / Mobile">
            <Input {...form.register("phone")} placeholder="Enter contact" />
          </FormField>
        </>
      )}
    />
  );
}
