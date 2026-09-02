import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, QrCode } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { printStaffIdCard } from "@/lib/qr-print";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useCreateDriver, useDrivers } from "@/features/drivers/hooks";
import { useVehicles } from "@/features/vehicles/hooks";
import { useMasterCollection } from "@/features/master-data/hooks";
import { licenceStatus } from "@/services/drivers.service";
import type { Driver } from "@/types";
import { formatDate } from "@/lib/formatters";

const GENDERS: NonNullable<Driver["gender"]>[] = ["Male", "Female", "Other"];

const schema = z.object({
  name: z.string().min(1, "Required"),
  cnic: z.string().min(1, "Required"),
  mobile: z.string().min(1, "Required"),
  licenceNumber: z.string().min(1, "Required"),
  licenceCategory: z.string().min(1, "Required"),
  licenceExpiry: z.string().min(1, "Required"),
  department: z.string().min(1, "Required"),
  assignedVehicleId: z.string().optional(),
  emergencyContact: z.string().optional(),
  fatherHusbandName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  residentialAddress: z.string().optional(),
  dateOfJoining: z.string().optional(),
  totalExperienceYears: z.number().optional(),
  accessLevel: z.string().optional(),
  uniformIssued: z.boolean(),
  idCardIssued: z.boolean(),
  rfidAccessCard: z.boolean(),
  nightDutyAllowed: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

const columns: ColumnDef<Driver>[] = [
  { accessorKey: "employeeId", header: "Employee ID" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "department", header: "Department" },
  { accessorKey: "mobile", header: "Mobile" },
  {
    accessorKey: "licenceExpiry",
    header: "Licence Expiry",
    cell: ({ getValue }) => formatDate(getValue<string>()),
  },
  {
    id: "licenceStatus",
    header: "Licence Status",
    cell: ({ row }) => <StatusBadge status={licenceStatus(row.original.licenceExpiry)} />,
  },
  {
    id: "idCard",
    header: "",
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Print ID card"
        onClick={(e) => {
          e.stopPropagation();
          printStaffIdCard({
            id: row.original.employeeId,
            name: row.original.name,
            role: row.original.department,
            photoUrl: row.original.photoUrl,
          });
        }}
      >
        <QrCode className="h-4 w-4" />
      </Button>
    ),
  },
];

export function DriversListPage() {
  const { data: drivers = [], isLoading } = useDrivers();
  const { data: vehicles = [] } = useVehicles();
  const { data: departments = [] } = useMasterCollection("departmentMasters");
  const createDriver = useCreateDriver();
  const [open, setOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      cnic: "",
      mobile: "",
      licenceNumber: "",
      licenceCategory: "",
      licenceExpiry: "",
      department: "",
      assignedVehicleId: "",
      emergencyContact: "",
      fatherHusbandName: "",
      dateOfBirth: "",
      gender: undefined,
      residentialAddress: "",
      dateOfJoining: "",
      totalExperienceYears: undefined,
      accessLevel: "",
      uniformIssued: false,
      idCardIssued: false,
      rfidAccessCard: false,
      nightDutyAllowed: false,
    },
  });

  async function onSubmit(values: FormValues) {
    const { uniformIssued, idCardIssued, rfidAccessCard, nightDutyAllowed, ...rest } = values;
    await createDriver.mutateAsync({
      ...rest,
      assignedVehicleId: values.assignedVehicleId || undefined,
      otherDetails: { uniformIssued, idCardIssued, rfidAccessCard, nightDutyAllowed },
    });
    toast.success(`${values.name} added as a driver.`);
    form.reset();
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Driver Master"
        description="Registered drivers, licence status and department assignment."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> Add Driver
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Driver</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Full Name" error={form.formState.errors.name?.message}>
                    <Input {...form.register("name")} placeholder="e.g. Muhammad Aslam" />
                  </FormField>
                  <FormField label="Department" error={form.formState.errors.department?.message}>
                    <Select onValueChange={(v) => form.setValue("department", v, { shouldValidate: true })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.name}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="CNIC" error={form.formState.errors.cnic?.message}>
                    <Input {...form.register("cnic")} placeholder="e.g. 35201-1234567-1" />
                  </FormField>
                  <FormField label="Mobile" error={form.formState.errors.mobile?.message}>
                    <Input {...form.register("mobile")} placeholder="e.g. 0300-1234567" />
                  </FormField>
                  <FormField label="Licence Number" error={form.formState.errors.licenceNumber?.message}>
                    <Input {...form.register("licenceNumber")} placeholder="e.g. DL-88213" />
                  </FormField>
                  <FormField label="Licence Category" error={form.formState.errors.licenceCategory?.message}>
                    <Input {...form.register("licenceCategory")} placeholder="e.g. LTV" />
                  </FormField>
                  <FormField label="Licence Expiry" error={form.formState.errors.licenceExpiry?.message}>
                    <Input type="date" {...form.register("licenceExpiry")} />
                  </FormField>
                  <FormField label="Assigned Vehicle (optional)">
                    <Select onValueChange={(v) => form.setValue("assignedVehicleId", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.registrationNumber} · {v.make} {v.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Emergency Contact (optional)">
                    <Input {...form.register("emergencyContact")} placeholder="e.g. 0301-9876543" />
                  </FormField>
                  <FormField label="Father / Husband Name (optional)">
                    <Input {...form.register("fatherHusbandName")} />
                  </FormField>
                  <FormField label="Date of Birth (optional)">
                    <Input type="date" {...form.register("dateOfBirth")} />
                  </FormField>
                  <FormField label="Gender (optional)">
                    <Select onValueChange={(v) => form.setValue("gender", v as FormValues["gender"])}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDERS.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Residential Address (optional)">
                    <Input {...form.register("residentialAddress")} />
                  </FormField>
                  <FormField label="Date of Joining (optional)">
                    <Input type="date" {...form.register("dateOfJoining")} />
                  </FormField>
                  <FormField label="Total Driving Experience (Years, optional)">
                    <Input type="number" {...form.register("totalExperienceYears", { valueAsNumber: true })} />
                  </FormField>
                  <FormField label="Access Level (optional)">
                    <Input {...form.register("accessLevel")} placeholder="e.g. Standard" />
                  </FormField>
                </div>

                <Separator />
                <p className="text-sm font-medium text-muted-foreground">Other Details</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="uniformIssued"
                      checked={form.watch("uniformIssued")}
                      onCheckedChange={(v) => form.setValue("uniformIssued", v === true)}
                    />
                    <Label htmlFor="uniformIssued">Uniform Issued</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="idCardIssued"
                      checked={form.watch("idCardIssued")}
                      onCheckedChange={(v) => form.setValue("idCardIssued", v === true)}
                    />
                    <Label htmlFor="idCardIssued">ID Card Issued</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="rfidAccessCard"
                      checked={form.watch("rfidAccessCard")}
                      onCheckedChange={(v) => form.setValue("rfidAccessCard", v === true)}
                    />
                    <Label htmlFor="rfidAccessCard">RFID / Access Card</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="nightDutyAllowed"
                      checked={form.watch("nightDutyAllowed")}
                      onCheckedChange={(v) => form.setValue("nightDutyAllowed", v === true)}
                    />
                    <Label htmlFor="nightDutyAllowed">Night Duty Allowed</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createDriver.isPending}>
                    Add Driver
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading drivers…</p>
      ) : (
        <DataTable columns={columns} data={drivers} searchPlaceholder="Search by name or employee ID…" />
      )}
    </div>
  );
}
