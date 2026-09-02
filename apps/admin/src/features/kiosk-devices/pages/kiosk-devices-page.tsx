import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Copy, Plus, Trash2 } from "lucide-react";
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
import { useCreateKioskDevice, useDeleteKioskDevice, useKioskDevices, useUpdateKioskDevice } from "@/features/kiosk-devices/hooks";
import { formatDateTime } from "@/lib/formatters";
import type { KioskDevice } from "@/services/kiosk-devices.service";

const schema = z.object({ name: z.string().min(1, "Required") });
type FormValues = z.infer<typeof schema>;

export function KioskDevicesPage() {
  const { data: devices = [], isLoading } = useKioskDevices();
  const createDevice = useCreateKioskDevice();
  const updateDevice = useUpdateKioskDevice();
  const deleteDevice = useDeleteKioskDevice();
  const [open, setOpen] = useState(false);
  const [issuedKey, setIssuedKey] = useState<{ name: string; apiKey: string } | null>(null);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: "" } });

  function openAdd() {
    form.reset({ name: "" });
    setOpen(true);
  }

  async function onSubmit(values: FormValues) {
    const device = await createDevice.mutateAsync(values.name);
    setOpen(false);
    setIssuedKey({ name: device.name, apiKey: device.apiKey });
  }

  function toggleActive(device: KioskDevice, checked: boolean) {
    updateDevice.mutate({ id: device.id, patch: { active: checked } });
  }

  function handleDelete(device: KioskDevice) {
    if (!window.confirm(`Delete "${device.name}"? This can't be undone — the device will need a new key to pair again.`)) {
      return;
    }
    deleteDevice.mutate(device.id);
  }

  const columns: ColumnDef<KioskDevice>[] = [
    { accessorKey: "name", header: "Name" },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Switch checked={row.original.active} onCheckedChange={(checked) => toggleActive(row.original, checked === true)} />
          <Badge variant={row.original.active ? "success" : "muted"}>{row.original.active ? "Active" : "Revoked"}</Badge>
        </div>
      ),
    },
    {
      accessorKey: "lastSeenAt",
      header: "Last Seen",
      cell: ({ getValue }) => {
        const value = getValue<string | null>();
        return value ? formatDateTime(value) : "Never";
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ getValue }) => formatDateTime(getValue<string>()),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" onClick={() => handleDelete(row.original)} aria-label="Delete">
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Kiosk Devices"
        description="Devices authorized to use the Entry, Exit and Fuel apps, identified by a per-device key."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAdd}>
                <Plus className="h-4 w-4" /> Add Device
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Device</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <FormField label="Device Name" error={form.formState.errors.name?.message}>
                  <Input {...form.register("name")} placeholder="e.g. Exit Tablet — Main Gate" />
                </FormField>
                <DialogFooter>
                  <Button type="submit" disabled={createDevice.isPending}>
                    Create
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading devices…</p>
      ) : (
        <DataTable columns={columns} data={devices} searchPlaceholder="Search devices…" />
      )}

      <IssuedKeyDialog issued={issuedKey} onClose={() => setIssuedKey(null)} />
    </div>
  );
}

function IssuedKeyDialog({ issued, onClose }: { issued: { name: string; apiKey: string } | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copyKey() {
    if (!issued) return;
    await navigator.clipboard.writeText(issued.apiKey);
    setCopied(true);
    toast.success("Key copied to clipboard.");
  }

  return (
    <Dialog
      open={issued !== null}
      onOpenChange={(open) => {
        if (!open) {
          setCopied(false);
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Device key for {issued?.name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Enter this on the device's pairing screen. It won't be shown again — copy it now.
        </p>
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted p-3 font-mono text-xs break-all">
          {issued?.apiKey}
        </div>
        <DialogFooter>
          <Button type="button" onClick={copyKey}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy Key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
