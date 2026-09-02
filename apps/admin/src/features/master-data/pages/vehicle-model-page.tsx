import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MasterListPage } from "@/features/master-data/components/master-list-page";
import { useMasterCollection } from "@/features/master-data/hooks";
import type { VehicleModelMaster } from "@/types";

const schema = z.object({
  code: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  makeId: z.string().min(1, "Required"),
  vehicleTypeId: z.string().min(1, "Required"),
  yearFrom: z.number().min(1980, "Too old").optional(),
});
type FormValues = z.infer<typeof schema>;

export function VehicleModelPage() {
  const { data: makes = [] } = useMasterCollection("vehicleMakes");
  const { data: vehicleTypes = [] } = useMasterCollection("vehicleTypes");
  const makeName = (id: string) => makes.find((m) => m.id === id)?.name ?? id;
  const typeName = (id: string) => vehicleTypes.find((t) => t.id === id)?.name ?? id;

  const columns: ColumnDef<VehicleModelMaster>[] = [
    { accessorKey: "code", header: "Code" },
    { id: "make", header: "Make", cell: ({ row }) => makeName(row.original.makeId) },
    { accessorKey: "name", header: "Model" },
    { id: "vehicleType", header: "Vehicle Type", cell: ({ row }) => typeName(row.original.vehicleTypeId) },
    { accessorKey: "yearFrom", header: "Year From" },
  ];

  return (
    <MasterListPage<"vehicleModels", VehicleModelMaster, FormValues>
      masterKey="vehicleModels"
      title="Vehicle Model Setup"
      description="Maintain models linked with vehicle makes and types."
      columns={columns}
      schema={schema}
      defaultValues={{ code: "", name: "", makeId: "", vehicleTypeId: "", yearFrom: undefined }}
      addLabel="Add Model"
      renderFields={(form) => (
        <>
          <FormField label="Model Code" error={form.formState.errors.code?.message}>
            <Input {...form.register("code")} placeholder="e.g. MOD-07" />
          </FormField>
          <FormField label="Vehicle Make" error={form.formState.errors.makeId?.message}>
            <Select
              defaultValue={form.getValues("makeId")}
              onValueChange={(v) => form.setValue("makeId", v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select make" />
              </SelectTrigger>
              <SelectContent>
                {makes.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Model Name" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} placeholder="e.g. Fortuner" />
          </FormField>
          <FormField label="Vehicle Type" error={form.formState.errors.vehicleTypeId?.message}>
            <Select
              defaultValue={form.getValues("vehicleTypeId")}
              onValueChange={(v) => form.setValue("vehicleTypeId", v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {vehicleTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Model Year From">
            <Input type="number" {...form.register("yearFrom", { valueAsNumber: true })} placeholder="Optional" />
          </FormField>
        </>
      )}
    />
  );
}
