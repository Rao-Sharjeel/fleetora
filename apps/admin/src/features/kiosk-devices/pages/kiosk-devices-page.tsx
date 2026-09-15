import { useEffect, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Copy, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
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
import {
  useCreateKioskDevice,
  useDeleteKioskDevice,
  useKioskDevices,
  useReissueKioskDevice,
  useUpdateKioskDevice,
} from "@/features/kiosk-devices/hooks";
import { formatDateTime } from "@/lib/formatters";
import type { KioskApp, KioskDevice } from "@/services/kiosk-devices.service";

const APPS: { value: KioskApp; label: string }[] = [
  { value: "exit", label: "Exit" },
  { value: "entry", label: "Entry" },
  { value: "fuel", label: "Fuel" },
];

const schema = z.object({
  name: z.string().min(1, "Required"),
  app: z.enum(["exit", "entry", "fuel"]),
});
type FormValues = z.infer<typeof schema>;

export function KioskDevicesPage() {
  const { data: devices = [], isLoading } = useKioskDevices();
  const createDevice = useCreateKioskDevice();
  const updateDevice = useUpdateKioskDevice();
  const reissueDevice = useReissueKioskDevice();
  const deleteDevice = useDeleteKioskDevice();
  const [open, setOpen] = useState(false);
  const [issuedKey, setIssuedKey] = useState<{ name: string; app: KioskApp | ""; apiKey: string } | null>(null);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: "", app: "exit" } });

  function openAdd() {
    form.reset({ name: "", app: "exit" });
    setOpen(true);
  }

  async function onSubmit(values: FormValues) {
    try {
      const device = await createDevice.mutateAsync(values);
      setOpen(false);
      setIssuedKey({ name: device.name, app: device.app, apiKey: device.apiKey });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add device.");
    }
  }

  function toggleActive(device: KioskDevice, checked: boolean) {
    updateDevice.mutate(
      { id: device.id, patch: { active: checked } },
      { onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update status.") },
    );
  }

  async function handleReissue(device: KioskDevice) {
    if (
      !window.confirm(
        device.claimed
          ? `Issue a new key for "${device.name}"? Its current key stops working immediately, and the paired tablet will need to be re-paired with the new one.`
          : `Issue a new key for "${device.name}"? Its current, unclaimed key stops working immediately.`,
      )
    ) {
      return;
    }
    try {
      const device2 = await reissueDevice.mutateAsync(device.id);
      setIssuedKey({ name: device2.name, app: device2.app, apiKey: device2.apiKey });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reissue key.");
    }
  }

  function handleDelete(device: KioskDevice) {
    if (!window.confirm(`Delete "${device.name}"? This can't be undone — the device will need a new key to pair again.`)) {
      return;
    }
    deleteDevice.mutate(device.id, {
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete device."),
    });
  }

  const columns: ColumnDef<KioskDevice>[] = [
    { accessorKey: "name", header: "Name" },
    {
      accessorKey: "app",
      header: "App",
      meta: { skeleton: "badge" },
      cell: ({ getValue }) => {
        const app = getValue<KioskApp | "">();
        return app ? <Badge variant="outline" dot={false}>{APPS.find((a) => a.value === app)?.label}</Badge> : "—";
      },
    },
    {
      id: "pairing",
      header: "Pairing",
      meta: { skeleton: "badge" },
      cell: ({ row }) => {
        const d = row.original;
        return d.claimed ? (
          <div className="flex flex-col gap-0.5">
            <Badge variant="success" dot={false}>Paired</Badge>
            {d.deviceLabel && <span className="text-xs text-muted-foreground">{d.deviceLabel}</span>}
          </div>
        ) : (
          <Badge variant="warning" dot={false}>Unclaimed</Badge>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Switch checked={row.original.active} onCheckedChange={(checked) => toggleActive(row.original, checked === true)} />
          <Badge variant={row.original.active ? "success" : "muted"} dot={false}>
            {row.original.active ? "Active" : "Revoked"}
          </Badge>
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
      meta: { skeleton: "action" },
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleReissue(row.original)}
            aria-label="Issue new key"
            title="Issue a new key for this device"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(row.original)} aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Kiosk Devices"
        description="Devices authorized to use the Entry, Exit and Fuel apps. Each key is scoped to one app and is claimed by exactly one physical device — pasting it into a second device or app is refused."
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
                  <Input {...form.register("name")} placeholder="e.g. Main Gate — Exit Tablet" />
                </FormField>
                <FormField label="App" error={form.formState.errors.app?.message}>
                  <Select value={form.watch("app")} onValueChange={(v) => form.setValue("app", v as KioskApp)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select app" />
                    </SelectTrigger>
                    <SelectContent>
                      {APPS.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <DialogFooter>
                  <Button type="submit" loading={createDevice.isPending} loadingText="Creating…">
                    Create
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <DataTable columns={columns} data={devices} searchPlaceholder="Search devices…" isLoading={isLoading} />

      <IssuedKeyDialog issued={issuedKey} onClose={() => setIssuedKey(null)} />
    </div>
  );
}

function IssuedKeyDialog({
  issued,
  onClose,
}: {
  issued: { name: string; app: KioskApp | ""; apiKey: string } | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!issued) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(issued.apiKey, { width: 360, margin: 1 }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [issued]);

  async function copyKey() {
    if (!issued) return;
    await navigator.clipboard.writeText(issued.apiKey);
    setCopied(true);
    toast.success("Key copied to clipboard.");
  }

  const appLabel = issued?.app ? APPS.find((a) => a.value === issued.app)?.label : null;

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
          <DialogTitle>
            Device key for {issued?.name}
            {appLabel && ` (${appLabel})`}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Scan this from the device's pairing screen — the camera claims it automatically. It won't be shown
          again after you close this, and it can only be claimed once: if this device pairs to the wrong
          tablet by mistake, issue a new key rather than trying to reuse this one.
        </p>
        {qrDataUrl && (
          <div className="flex justify-center rounded-lg border border-border bg-white p-4">
            <img src={qrDataUrl} alt="Device key QR code" className="h-48 w-48" />
          </div>
        )}
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
