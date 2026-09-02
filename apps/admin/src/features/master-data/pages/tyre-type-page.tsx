import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { MasterListPage } from "@/features/master-data/components/master-list-page";
import type { TyreTypeMaster } from "@/types";

const schema = z.object({
  code: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  brand: z.string().min(1, "Required"),
  size: z.string().min(1, "Required"),
  typePattern: z.string().min(1, "Required"),
  plyLoad: z.string().optional(),
  stdLifeKm: z.number().min(0, "Must be 0 or greater").optional(),
});
type FormValues = z.infer<typeof schema>;

const columns: ColumnDef<TyreTypeMaster>[] = [
  { accessorKey: "code", header: "Code" },
  { accessorKey: "brand", header: "Brand" },
  { accessorKey: "size", header: "Size / Spec" },
  { accessorKey: "typePattern", header: "Type" },
  { accessorKey: "plyLoad", header: "Ply / Load" },
  { accessorKey: "stdLifeKm", header: "Std Life (KM)" },
];

export function TyreTypePage() {
  return (
    <MasterListPage<"tyreTypes", TyreTypeMaster, FormValues>
      masterKey="tyreTypes"
      title="Tyre Type Setup"
      description="Manage all tyre brands, sizes and types used in vehicles."
      columns={columns}
      schema={schema}
      defaultValues={{ code: "", name: "", brand: "", size: "", typePattern: "Tubeless", plyLoad: "", stdLifeKm: undefined }}
      addLabel="Add Tyre Type"
      renderFields={(form) => (
        <>
          <FormField label="Tyre Code" error={form.formState.errors.code?.message}>
            <Input {...form.register("code")} placeholder="e.g. TYR-07" />
          </FormField>
          <FormField label="Display Name" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} placeholder="e.g. TYR-20565R15" />
          </FormField>
          <FormField label="Brand" error={form.formState.errors.brand?.message}>
            <Input {...form.register("brand")} placeholder="e.g. Bridgestone" />
          </FormField>
          <FormField label="Size / Specification" error={form.formState.errors.size?.message}>
            <Input {...form.register("size")} placeholder="e.g. 205/65 R15" />
          </FormField>
          <FormField label="Type / Pattern" error={form.formState.errors.typePattern?.message}>
            <Input {...form.register("typePattern")} placeholder="Tubeless / Tube Type" />
          </FormField>
          <FormField label="Ply / Load">
            <Input {...form.register("plyLoad")} placeholder="e.g. 4 Ply" />
          </FormField>
          <FormField label="Standard Life (KM)">
            <Input type="number" {...form.register("stdLifeKm", { valueAsNumber: true })} />
          </FormField>
        </>
      )}
    />
  );
}
