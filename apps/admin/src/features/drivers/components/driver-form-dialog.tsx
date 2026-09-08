import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus, User, BadgeCheck, Car, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { PhotoCapture } from "@/components/shared/photo-capture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogTrigger, FullScreenDialogContent } from "@/components/ui/dialog";
import {
  FormModalHeader,
  FormModalNav,
  FormModalBody,
  FormModalFooter,
  FormSection,
  useFormModalScrollSpy,
  type FormModalSection,
} from "@/components/shared/form-modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateDriver, useUpdateDriver } from "@/features/drivers/hooks";
import { useVehicles } from "@/features/vehicles/hooks";
import { useMasterCollection } from "@/features/master-data/hooks";
import type { Driver } from "@/types";
import { emptyToUndefined, emptyStringToUndefined, fileToDataUrl } from "@/lib/utils";

const GENDERS: NonNullable<Driver["gender"]>[] = ["Male", "Female", "Other"];

const DRIVER_SECTIONS: FormModalSection[] = [
  { id: "personal", label: "Personal Information", icon: User },
  { id: "licence", label: "Licence & Employment", icon: BadgeCheck },
  { id: "assignment", label: "Assignment", icon: Car },
  { id: "equipment", label: "Equipment & Access", icon: ShieldCheck },
];

const schema = z.object({
  name: z.string().min(1, "Required"),
  photoUrl: z.string().optional(),
  companyIdCode: z.string().min(1, "Required"),
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

const emptyDefaults: FormValues = {
  name: "",
  photoUrl: undefined,
  companyIdCode: "",
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
};

// photoUrl is deliberately left undefined here — the field only ever accepts a
// fresh base64 capture (see Base64ImageField server-side), never the record's
// existing https:// photo URL. PhotoCapture shows that via `initialPreviewUrl`
// instead, entirely separate from this form field.
function driverToFormValues(driver: Driver): FormValues {
  return {
    name: driver.name,
    photoUrl: undefined,
    companyIdCode: driver.companyIdCode,
    cnic: driver.cnic,
    mobile: driver.mobile,
    licenceNumber: driver.licenceNumber,
    licenceCategory: driver.licenceCategory,
    licenceExpiry: driver.licenceExpiry,
    department: driver.department,
    assignedVehicleId: driver.assignedVehicleId ?? "",
    emergencyContact: driver.emergencyContact ?? "",
    fatherHusbandName: driver.fatherHusbandName ?? "",
    dateOfBirth: driver.dateOfBirth ?? "",
    // The backend stores an unset gender as "" (CharField default), not null/absent —
    // zod's enum().optional() only accepts a real `undefined`, so "" must be coerced
    // here or validation fails silently (Gender has no wired-up FormField error prop).
    gender: driver.gender || undefined,
    residentialAddress: driver.residentialAddress ?? "",
    dateOfJoining: driver.dateOfJoining ?? "",
    totalExperienceYears: driver.totalExperienceYears,
    accessLevel: driver.accessLevel ?? "",
    uniformIssued: driver.otherDetails?.uniformIssued ?? false,
    idCardIssued: driver.otherDetails?.idCardIssued ?? false,
    rfidAccessCard: driver.otherDetails?.rfidAccessCard ?? false,
    nightDutyAllowed: driver.otherDetails?.nightDutyAllowed ?? false,
  };
}

interface DriverFormDialogProps {
  mode: "add" | "edit";
  /** Required when mode === "edit". */
  driver?: Driver;
}

/** Add/Edit Driver — one dialog for both, matching master-list-page.tsx's
 * add-vs-edit-in-one-form pattern. Used from the Drivers list page (add) and
 * the Driver profile page (edit). */
export function DriverFormDialog({ mode, driver }: DriverFormDialogProps) {
  const { data: vehicles = [] } = useVehicles();
  const { data: departments = [] } = useMasterCollection("departmentMasters");
  const createDriver = useCreateDriver();
  const updateDriver = useUpdateDriver();
  const [open, setOpen] = useState(false);
  const { containerRef, activeId } = useFormModalScrollSpy(DRIVER_SECTIONS);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: mode === "edit" && driver ? driverToFormValues(driver) : emptyDefaults,
  });

  function handleOpenChange(next: boolean) {
    if (next) {
      form.reset(mode === "edit" && driver ? driverToFormValues(driver) : emptyDefaults);
    }
    setOpen(next);
  }

  const isPending = createDriver.isPending || updateDriver.isPending;

  async function onSubmit(values: FormValues) {
    const { uniformIssued, idCardIssued, rfidAccessCard, nightDutyAllowed, ...rest } = values;
    const payload = {
      ...rest,
      assignedVehicleId: values.assignedVehicleId || undefined,
      otherDetails: { uniformIssued, idCardIssued, rfidAccessCard, nightDutyAllowed },
    };
    try {
      if (mode === "edit" && driver) {
        await updateDriver.mutateAsync({ id: driver.id, patch: payload });
        toast.success(`${values.name} updated.`);
      } else {
        await createDriver.mutateAsync(payload);
        toast.success(`${values.name} added as a driver.`);
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${mode === "edit" ? "update" : "add"} driver.`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {mode === "edit" ? (
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" /> Add Driver
          </Button>
        )}
      </DialogTrigger>
      <FullScreenDialogContent>
        <FormModalHeader
          icon={User}
          title={mode === "edit" ? "Edit Driver" : "Add Driver"}
          description={
            mode === "edit"
              ? "Update this driver's details, licence and department assignment."
              : "Register a new driver, their licence and department assignment."
          }
        />
        <div className="flex flex-1 overflow-hidden">
          <FormModalNav sections={DRIVER_SECTIONS} activeId={activeId} />
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
            <FormModalBody containerRef={containerRef}>
              <FormSection
                id="personal"
                icon={User}
                title="Personal Information"
                description="Identity and contact details."
              >
                <PhotoCapture
                  label="Driver Photo"
                  initialPreviewUrl={driver?.photoUrl}
                  onCapture={async (file) => form.setValue("photoUrl", await fileToDataUrl(file))}
                />
                <FormField label="Full Name" error={form.formState.errors.name?.message}>
                  <Input {...form.register("name")} placeholder="e.g. Muhammad Aslam" />
                </FormField>
                <FormField label="Company ID" error={form.formState.errors.companyIdCode?.message}>
                  <Input {...form.register("companyIdCode")} placeholder="e.g. CMP-1027" />
                </FormField>
                <FormField label="CNIC" error={form.formState.errors.cnic?.message}>
                  <Input {...form.register("cnic")} placeholder="e.g. 35201-1234567-1" />
                </FormField>
                <FormField label="Mobile" error={form.formState.errors.mobile?.message}>
                  <Input {...form.register("mobile")} placeholder="e.g. 0300-1234567" />
                </FormField>
                <FormField label="Father / Husband Name (optional)">
                  <Input {...form.register("fatherHusbandName")} />
                </FormField>
                <FormField label="Date of Birth (optional)">
                  <Input type="date" {...form.register("dateOfBirth", { setValueAs: emptyStringToUndefined })} />
                </FormField>
                <FormField label="Gender (optional)">
                  <Select
                    value={form.watch("gender")}
                    onValueChange={(v) => form.setValue("gender", v as FormValues["gender"])}
                  >
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
              </FormSection>

              <FormSection
                id="licence"
                icon={BadgeCheck}
                title="Licence & Employment"
                description="Driving licence and department record."
              >
                <FormField label="Licence Number" error={form.formState.errors.licenceNumber?.message}>
                  <Input {...form.register("licenceNumber")} placeholder="e.g. DL-88213" />
                </FormField>
                <FormField label="Licence Category" error={form.formState.errors.licenceCategory?.message}>
                  <Input {...form.register("licenceCategory")} placeholder="e.g. LTV" />
                </FormField>
                <FormField label="Licence Expiry" error={form.formState.errors.licenceExpiry?.message}>
                  <Input type="date" {...form.register("licenceExpiry")} />
                </FormField>
                <FormField label="Department" error={form.formState.errors.department?.message}>
                  <Select
                    value={form.watch("department")}
                    onValueChange={(v) => form.setValue("department", v, { shouldValidate: true })}
                  >
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
                <FormField label="Date of Joining (optional)">
                  <Input type="date" {...form.register("dateOfJoining", { setValueAs: emptyStringToUndefined })} />
                </FormField>
                <FormField label="Total Driving Experience (Years, optional)">
                  <Input type="number" {...form.register("totalExperienceYears", { setValueAs: emptyToUndefined })} />
                </FormField>
                <FormField label="Access Level (optional)">
                  <Input {...form.register("accessLevel")} placeholder="e.g. Standard" />
                </FormField>
              </FormSection>

              <FormSection
                id="assignment"
                icon={Car}
                title="Assignment"
                description="Vehicle assignment and emergency contact."
              >
                <FormField label="Assigned Vehicle (optional)">
                  <Select
                    value={form.watch("assignedVehicleId")}
                    onValueChange={(v) => form.setValue("assignedVehicleId", v)}
                  >
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
              </FormSection>

              <FormSection
                id="equipment"
                icon={ShieldCheck}
                title="Equipment & Access"
                description="Issued gear and site access permissions."
                columns={1}
              >
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
              </FormSection>
            </FormModalBody>

            <FormModalFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : mode === "edit" ? "Save Changes" : "Add Driver"}
              </Button>
            </FormModalFooter>
          </form>
        </div>
      </FullScreenDialogContent>
    </Dialog>
  );
}
