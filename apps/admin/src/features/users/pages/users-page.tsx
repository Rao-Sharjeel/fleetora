import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { FormField } from "@/components/shared/form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PermissionPicker } from "@/features/users/components/permission-picker";
import { RolesPanel } from "@/features/users/components/roles-panel";
import { useCreateUser, usePermissionCatalog, useRoles, useUpdateUser, useUsers } from "@/features/users/hooks";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import type { AppUser, PermissionCode, UserType } from "@/types";

const NO_ROLE = "none";

const schema = z.object({
  name: z.string().min(1, "Required"),
  email: z.string().min(1, "Required").email("Enter a valid email"),
  userType: z.enum(["admin", "staff"]),
  roleId: z.string(),
  directPermissions: z.array(z.string()),
  active: z.boolean(),
  password: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = {
  name: "",
  email: "",
  userType: "staff",
  roleId: NO_ROLE,
  directPermissions: [],
  active: true,
  password: "",
};

export function UsersPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users & Permissions"
        description="Who can sign in, and what each person can see and do."
      />
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UsersPanel />
        </TabsContent>
        <TabsContent value="roles">
          <RolesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UsersPanel() {
  const { data: users = [], isLoading } = useUsers();
  const { data: roles = [] } = useRoles();
  const catalog = usePermissionCatalog();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const currentUserId = useSession((s) => s.userId);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });
  const userType = form.watch("userType");
  const roleId = form.watch("roleId");
  const directPermissions = form.watch("directPermissions");
  const rolePermissions = roles.find((r) => r.id === roleId)?.permissions ?? [];
  const extraCount = directPermissions.filter((p) => !rolePermissions.includes(p)).length;
  const editingSelf = editingId !== null && editingId === currentUserId;

  function openAdd() {
    setEditingId(null);
    form.reset(defaultValues);
    setOpen(true);
  }

  function openEdit(user: AppUser) {
    setEditingId(user.id);
    form.reset({
      name: user.name,
      email: user.email,
      userType: user.userType,
      roleId: user.roleId ?? NO_ROLE,
      directPermissions: user.directPermissions,
      active: user.active,
      password: "",
    });
    setOpen(true);
  }

  async function onSubmit(values: FormValues) {
    const isStaff = values.userType === "staff";
    const payload = {
      name: values.name,
      email: values.email,
      userType: values.userType,
      roleId: isStaff && values.roleId !== NO_ROLE ? values.roleId : null,
      // Anything the role already grants is dropped, so extras stay just extras.
      directPermissions: isStaff ? values.directPermissions.filter((p) => !rolePermissions.includes(p)) : [],
      active: values.active,
    };
    try {
      if (editingId) {
        await updateUser.mutateAsync({
          id: editingId,
          patch: values.password ? { ...payload, password: values.password } : payload,
        });
        toast.success("User updated.");
      } else {
        if (!values.password) {
          form.setError("password", { message: "Required" });
          return;
        }
        await createUser.mutateAsync({ ...payload, password: values.password });
        toast.success(`${values.name} added.`);
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save user.");
    }
  }

  function toggleActive(user: AppUser, checked: boolean) {
    updateUser.mutate(
      { id: user.id, patch: { active: checked } },
      { onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update status.") },
    );
  }

  const columns: ColumnDef<AppUser>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "email", header: "Email" },
    {
      id: "access",
      header: "Access",
      cell: ({ row }) => {
        const user = row.original;
        if (user.userType === "admin") {
          return (
            <Badge variant="default" dot={false}>
              Administrator
            </Badge>
          );
        }
        const extras = user.directPermissions.length;
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn(!user.roleName && "text-muted-foreground")}>{user.roleName ?? "No role"}</span>
            {extras > 0 && (
              <Badge variant="muted" dot={false}>
                +{extras} extra
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: "permissions",
      header: "Permissions",
      cell: ({ row }) =>
        row.original.userType === "admin" ? "All" : row.original.effectivePermissions.length || "None",
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={row.original.active}
            disabled={row.original.id === currentUserId}
            onCheckedChange={(checked) => toggleActive(row.original, checked === true)}
          />
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Administrators can do everything. Staff can do what their role and any extra permissions allow.
        </p>
        <Button onClick={openAdd} className="shrink-0">
          <Plus className="h-4 w-4" /> Add User
        </Button>
      </div>
      <DataTable columns={columns} data={users} searchPlaceholder="Search users…" isLoading={isLoading} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit User" : "Add User"}</DialogTitle>
          </DialogHeader>
          <form key={editingId ?? "new"} onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Full Name" error={form.formState.errors.name?.message}>
                <Input {...form.register("name")} placeholder="e.g. Ayesha Khan" />
              </FormField>
              <FormField label="Email" error={form.formState.errors.email?.message}>
                <Input {...form.register("email")} placeholder="e.g. ayesha@company.com" />
              </FormField>
              <FormField label={editingId ? "New Password" : "Password"} error={form.formState.errors.password?.message}>
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...form.register("password")}
                  placeholder={editingId ? "Leave blank to keep current" : "Set an initial password"}
                />
              </FormField>
              <FormField label="Status">
                <div className="flex h-9 items-center gap-2">
                  <Switch
                    checked={form.watch("active")}
                    disabled={editingSelf}
                    onCheckedChange={(v) => form.setValue("active", v === true)}
                  />
                  <span className="text-sm text-muted-foreground">{form.watch("active") ? "Active" : "Inactive"}</span>
                </div>
              </FormField>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">User type</span>
              <div className="grid gap-2 sm:grid-cols-2">
                <UserTypeOption
                  type="admin"
                  selected={userType === "admin"}
                  disabled={editingSelf}
                  onSelect={(t) => form.setValue("userType", t)}
                  icon={<ShieldCheck className="h-4 w-4" />}
                  title="Administrator"
                  description="Full access, including users, roles and kiosk devices."
                />
                <UserTypeOption
                  type="staff"
                  selected={userType === "staff"}
                  disabled={editingSelf}
                  onSelect={(t) => form.setValue("userType", t)}
                  icon={<UserRound className="h-4 w-4" />}
                  title="Staff"
                  description="Access from a role, plus any extra permissions below."
                />
              </div>
              {editingSelf && (
                <p className="text-xs text-muted-foreground">You can't change your own user type or deactivate yourself.</p>
              )}
            </div>

            {userType === "staff" && (
              <>
                <FormField label="Role">
                  <Select value={roleId} onValueChange={(v) => form.setValue("roleId", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_ROLE}>No role — extra permissions only</SelectItem>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} ({r.permissions.length})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">Extra permissions</span>
                    <span className="text-xs text-muted-foreground">
                      {rolePermissions.length} from role · {extraCount} extra
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Locked ticks come from the role. Extra permissions only add — to take something away, pick a
                    different role.
                  </p>
                  <PermissionPicker
                    groups={catalog.data}
                    isLoading={catalog.isLoading}
                    value={directPermissions}
                    locked={rolePermissions}
                    onChange={(codes: PermissionCode[]) => form.setValue("directPermissions", codes)}
                  />
                </div>
              </>
            )}

            <DialogFooter>
              <Button type="submit" loading={createUser.isPending || updateUser.isPending} loadingText="Saving…">
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserTypeOption({
  type,
  selected,
  disabled,
  onSelect,
  icon,
  title,
  description,
}: {
  type: UserType;
  selected: boolean;
  disabled?: boolean;
  onSelect: (type: UserType) => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={() => onSelect(type)}
      className={cn(
        "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted",
      )}
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
      </span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  );
}
