import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMaintenanceRecords, useCreateMaintenanceRecord } from "@/features/maintenance/hooks";
import { useVehicles } from "@/features/vehicles/hooks";
import { formatCurrency, formatDate, formatKm } from "@/lib/formatters";
import type { MaintenanceCategory } from "@/types";

const CATEGORIES: { value: MaintenanceCategory; label: string }[] = [
  { value: "engine", label: "Engine" },
  { value: "transmission", label: "Transmission" },
  { value: "brakes", label: "Brakes" },
  { value: "suspension", label: "Suspension" },
  { value: "electrical", label: "Electrical" },
  { value: "ac", label: "Air Conditioning" },
  { value: "tyres", label: "Tyres" },
  { value: "other", label: "Other" },
];

export function MaintenancePage() {
  const { data: records = [], isLoading } = useMaintenanceRecords();
  const { data: vehicles = [] } = useVehicles();
  const createRecord = useCreateMaintenanceRecord();
  const [open, setOpen] = useState(false);

  const [vehicleId, setVehicleId] = useState("");
  const [odometer, setOdometer] = useState("");
  const [workshop, setWorkshop] = useState("");
  const [categories, setCategories] = useState<MaintenanceCategory[]>([]);
  const [totalCost, setTotalCost] = useState("");
  const [nextDueOdometer, setNextDueOdometer] = useState("");
  const [remarks, setRemarks] = useState("");

  function toggleCategory(cat: MaintenanceCategory) {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  }

  async function handleSave() {
    if (!vehicleId || !odometer || !workshop || categories.length === 0 || !totalCost) {
      toast.error("Please complete vehicle, odometer, workshop, at least one category and cost.");
      return;
    }
    await createRecord.mutateAsync({
      vehicleId,
      date: new Date().toISOString().slice(0, 10),
      odometer: Number(odometer),
      workshop,
      categories,
      totalCost: Number(totalCost),
      nextDueOdometer: nextDueOdometer ? Number(nextDueOdometer) : undefined,
      remarks: remarks || undefined,
    });
    toast.success("Maintenance record saved.");
    setVehicleId("");
    setOdometer("");
    setWorkshop("");
    setCategories([]);
    setTotalCost("");
    setNextDueOdometer("");
    setRemarks("");
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Maintenance Management"
        description="Mileage-based service history and upcoming due alerts."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> New Maintenance Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Vehicle Maintenance</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Vehicle</Label>
                  <Select value={vehicleId} onValueChange={setVehicleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.registrationNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>Odometer</Label>
                    <Input type="number" value={odometer} onChange={(e) => setOdometer(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Workshop / Vendor</Label>
                    <Input value={workshop} onChange={(e) => setWorkshop(e.target.value)} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Service Items</Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {CATEGORIES.map((c) => (
                      <label key={c.value} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={categories.includes(c.value)} onCheckedChange={() => toggleCategory(c.value)} />
                        {c.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>Total Cost</Label>
                    <Input type="number" value={totalCost} onChange={(e) => setTotalCost(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Next Due Odometer (optional)</Label>
                    <Input type="number" value={nextDueOdometer} onChange={(e) => setNextDueOdometer(e.target.value)} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Remarks</Label>
                  <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSave} disabled={createRecord.isPending}>
                  Save Maintenance
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading maintenance records…</p>
      ) : records.length === 0 ? (
        <EmptyState title="No maintenance records yet." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {records.map((record) => {
            const vehicle = vehicles.find((v) => v.id === record.vehicleId);
            return (
              <Card key={record.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{vehicle?.registrationNumber ?? record.vehicleId}</CardTitle>
                  {record.maintenanceAlertStatus && <StatusBadge status={record.maintenanceAlertStatus} />}
                </CardHeader>
                <CardContent className="flex flex-col gap-1 text-sm">
                  <p className="font-medium capitalize">{record.categories.join(", ")}</p>
                  <p className="text-muted-foreground">
                    {formatDate(record.date)} · {record.workshop} · {formatKm(record.odometer)}
                  </p>
                  <p className="text-muted-foreground">Cost: {formatCurrency(record.totalCost)}</p>
                  {record.remainingKm != null && (
                    <p className="text-muted-foreground">
                      {formatKm(Math.abs(record.remainingKm))} {record.remainingKm >= 0 ? "remaining" : "overdue"}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
