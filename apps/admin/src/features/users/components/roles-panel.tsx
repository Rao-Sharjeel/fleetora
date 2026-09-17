import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/data-table";
import { FormField } from "@/components/shared/form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PermissionPicker } from "@/features/users/components/permission-picker";
import { useDeleteRole, usePermissionCatalog, useRoles, useSaveRole } from "@/features/users/hooks";
import type { PermissionCode, Role } from "@/types";

interface Draft {
  name: string;
  description: string;
  permissions: PermissionCode[];
}

const emptyDraft: Draft = { name: "", description: "", permissions: [] };

export function RolesPanel() {
  const { data: roles = [], isLoading } = useRoles();
  const catalog = usePermissionCatalog();
  const saveRole = useSaveRole();
  const deleteRole = useDeleteRole();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [nameError, setNameError] = useState<string>();

  function openEditor(role: Role | null) {
    setEditing(role);
    setDraft(role ? { name: role.name, description: role.description, permissions: role.permissions } : emptyDraft);
    setNameError(undefined);
    setOpen(true);
  }

  async function handleSave() {
    if (!draft.name.trim()) {
      setNameError("Required");
      return;
    }
    try {
      await saveRole.mutateAsync({ id: editing?.id, payload: { ...draft, name: draft.name.trim() } });
      toast.success(editing ? `${draft.name} updated.` : `${draft.name} created.`);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save role.");
    }
  }

  async function handleDelete(role: Role) {
    if (!window.confirm(`Delete the "${role.name}" role? This can't be undone.`)) return;
    try {
      await deleteRole.mutateAsync(role.id);
      toast.success(`${role.name} deleted.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete role.");
    }
  }

  const columns: ColumnDef<Role>[] = [
    {
      accessorKey: "name",
      header: "Role",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="flex items-center gap-2 font-medium">
            {row.original.name}
            {row.original.isSystem && (
              <Badge variant="muted" dot={false}>
                Default
              </Badge>
            )}
          </span>
          {row.original.description && (
            <span className="text-xs text-muted-foreground">{row.original.description}</span>
          )}
        </div>
      ),
    },
    {
      id: "permissions",
      header: "Permissions",
      cell: ({ row }) => row.original.permissions.length,
    },
    { accessorKey: "userCount", header: "Users" },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEditor(row.original)} aria-label="Edit role">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(row.original)}
            disabled={row.original.userCount > 0}
            title={row.original.userCount > 0 ? "Move its users to another role first" : "Delete role"}
            aria-label="Delete role"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          A role is a named set of permissions. Each staff member has one role, plus any extra permissions you
          grant them directly.
        </p>
        <Button onClick={() => openEditor(null)} className="shrink-0">
          <Plus className="h-4 w-4" /> New Role
        </Button>
      </div>
      <DataTable columns={columns} data={roles} searchPlaceholder="Search roles…" isLoading={isLoading} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "New Role"}</DialogTitle>
            {editing && editing.userCount > 0 && (
              <DialogDescription>
                Changes apply to the {editing.userCount} user(s) with this role.
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Name" error={nameError}>
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. Workshop Supervisor"
                />
              </FormField>
              <FormField label="Description">
                <Input
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="Optional"
                />
              </FormField>
            </div>
            <PermissionPicker
              groups={catalog.data}
              isLoading={catalog.isLoading}
              value={draft.permissions}
              onChange={(permissions) => setDraft({ ...draft, permissions })}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleSave} loading={saveRole.isPending} loadingText="Saving…">
              Save Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
