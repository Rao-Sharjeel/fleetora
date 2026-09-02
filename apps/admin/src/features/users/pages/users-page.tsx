import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { FormField } from "@/components/shared/form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateUser, useUpdateUser, useUsers } from "@/features/users/hooks";
import { ROLES } from "@/hooks/use-session";
import type { AppUser, Role } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Required"),
  email: z.string().min(1, "Required").email("Enter a valid email"),
  role: z.custom<Role>((v) => typeof v === "string" && v.length > 0, "Required"),
  active: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = { name: "", email: "", role: "fleet_manager", active: true };

export function UsersPage() {
  const { data: users = [], isLoading } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });

  function openAdd() {
    setEditingId(null);
    form.reset(defaultValues);
    setOpen(true);
  }

  function openEdit(user: AppUser) {
    setEditingId(user.id);
    form.reset({ name: user.name, email: user.email, role: user.role, active: user.active });
    setOpen(true);
  }

  async function onSubmit(values: FormValues) {
    if (editingId) {
      await updateUser.mutateAsync({ id: editingId, patch: values });
      toast.success("User updated.");
    } else {
      await createUser.mutateAsync(values);
      toast.success(`${values.name} added.`);
    }
    setOpen(false);
  }

  function toggleActive(user: AppUser, checked: boolean) {
    updateUser.mutate({ id: user.id, patch: { active: checked } });
  }

  const columns: ColumnDef<AppUser>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "email", header: "Email" },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ getValue }) => ROLES.find((r) => r.id === getValue<AppUser["role"]>())?.label ?? getValue<string>(),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Switch checked={row.original.active} onCheckedChange={(checked) => toggleActive(row.original, checked === true)} />
          <Badge variant={row.original.active ? "success" : "muted"}>{row.original.active ? "Active" : "Inactive"}</Badge>
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)} aria-label="Edit">
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users & Permissions"
        description="Application accounts and their assigned role."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAdd}>
                <Plus className="h-4 w-4" /> Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit User" : "Add User"}</DialogTitle>
              </DialogHeader>
              <form key={editingId ?? "new"} onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Full Name" error={form.formState.errors.name?.message}>
                    <Input {...form.register("name")} placeholder="e.g. Ayesha Khan" />
                  </FormField>
                  <FormField label="Email" error={form.formState.errors.email?.message}>
                    <Input {...form.register("email")} placeholder="e.g. ayesha@company.com" />
                  </FormField>
                  <FormField label="Role" error={form.formState.errors.role?.message}>
                    <Select value={form.watch("role")} onValueChange={(v) => form.setValue("role", v as Role)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Status">
                    <div className="flex h-9 items-center gap-2">
                      <Switch checked={form.watch("active")} onCheckedChange={(v) => form.setValue("active", v === true)} />
                      <span className="text-sm text-muted-foreground">{form.watch("active") ? "Active" : "Inactive"}</span>
                    </div>
                  </FormField>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createUser.isPending || updateUser.isPending}>
                    Save
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading users…</p>
      ) : (
        <DataTable columns={columns} data={users} searchPlaceholder="Search users…" />
      )}
    </div>
  );
}
