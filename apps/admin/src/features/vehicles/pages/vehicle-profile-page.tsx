import { useState } from "react";
import { useParams } from "react-router-dom";
import { QrCode, ShieldCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PhotoCapture } from "@/components/shared/photo-capture";
import { FormField } from "@/components/shared/form-field";
import { printVehicleQrLabel } from "@/lib/qr-print";
import { useVehicle, useSetAllowedToExit } from "@/features/vehicles/hooks";
import { useDriver } from "@/features/drivers/hooks";
import { useTrips } from "@/features/trips/hooks";
import { useFuelEntries } from "@/features/fuel/hooks";
import { useMaintenanceRecords } from "@/features/maintenance/hooks";
import { useTyres } from "@/features/tyres/hooks";
import { useDocuments } from "@/features/documents/hooks";
import { useAuditLog } from "@/features/audit/hooks";
import { formatCurrency, formatDate, formatDateTime, formatKm } from "@/lib/formatters";
import { useMasterCollection } from "@/features/master-data/hooks";

export function VehicleProfilePage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const { data: vehicle } = useVehicle(vehicleId);
  const { data: driver } = useDriver(vehicle?.assignedDriverId);
  const { data: trips = [] } = useTrips();
  const { data: fuelEntries = [] } = useFuelEntries();
  const { data: maintenanceRecords = [] } = useMaintenanceRecords();
  const { data: tyres = [] } = useTyres();
  const { data: documents = [] } = useDocuments();
  const { data: auditLog = [] } = useAuditLog();
  const { data: documentTypes = [] } = useMasterCollection("documentTypes");

  const setAllowedToExit = useSetAllowedToExit();
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [allowedDraft, setAllowedDraft] = useState(true);
  const [reasonDraft, setReasonDraft] = useState("");

  if (!vehicle) return <p className="text-sm text-muted-foreground">Loading vehicle…</p>;

  function openExitDialog() {
    setAllowedDraft(vehicle!.allowedToExit);
    setReasonDraft(vehicle!.allowedToExitReason ?? "");
    setExitDialogOpen(true);
  }

  async function saveExitAccess() {
    if (!vehicle) return;
    if (!allowedDraft && !reasonDraft.trim()) {
      toast.error("A reason is required when marking a vehicle not allowed to exit.");
      return;
    }
    await setAllowedToExit.mutateAsync({
      vehicleId: vehicle.id,
      allowed: allowedDraft,
      reason: allowedDraft ? undefined : reasonDraft.trim(),
    });
    toast.success(allowedDraft ? "Vehicle is now allowed to exit." : "Vehicle exit has been blocked.");
    setExitDialogOpen(false);
  }

  const vehicleTrips = trips.filter((t) => t.vehicleId === vehicle.id);
  const vehicleFuel = fuelEntries.filter((f) => f.vehicleId === vehicle.id);
  const vehicleMaintenance = maintenanceRecords.filter((m) => m.vehicleId === vehicle.id);
  const vehicleTyres = tyres.filter((t) => t.vehicleId === vehicle.id);
  const vehicleDocuments = documents.filter((d) => d.ownerType === "vehicle" && d.ownerId === vehicle.id);

  const totalFuelCost = vehicleFuel.reduce((sum, f) => sum + f.total, 0);
  const totalMaintenanceCost = vehicleMaintenance.reduce((sum, m) => sum + m.totalCost, 0);
  const totalKm = vehicleTrips.reduce((sum, t) => sum + (t.tripKm ?? 0), 0);
  const costPerKm = totalKm ? (totalFuelCost + totalMaintenanceCost) / totalKm : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${vehicle.registrationNumber} — ${vehicle.make} ${vehicle.model}`}
        description={`Current odometer: ${formatKm(vehicle.currentOdometer)} · Driver: ${driver?.name ?? "Unassigned"}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => printVehicleQrLabel(vehicle.registrationNumber, vehicle.qrCode)}>
              <QrCode className="h-4 w-4" /> Print QR
            </Button>
            <Button
              variant={vehicle.allowedToExit ? "outline" : "destructive"}
              size="sm"
              onClick={openExitDialog}
            >
              {vehicle.allowedToExit ? (
                <ShieldCheck className="h-4 w-4 text-success" />
              ) : (
                <ShieldX className="h-4 w-4" />
              )}
              {vehicle.allowedToExit ? "Allowed to Exit" : "Exit Blocked"}
            </Button>
            <StatusBadge status={vehicle.status} />
          </div>
        }
      />

      <Dialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exit Access — {vehicle.registrationNumber}</DialogTitle>
            <DialogDescription>
              Controls whether this vehicle shows a green "Allowed to Exit" flag at the Exit gate.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={allowedDraft ? "default" : "outline"}
              className="flex-1"
              onClick={() => setAllowedDraft(true)}
            >
              <ShieldCheck className="h-4 w-4" /> Allowed to Exit
            </Button>
            <Button
              type="button"
              variant={!allowedDraft ? "destructive" : "outline"}
              className="flex-1"
              onClick={() => setAllowedDraft(false)}
            >
              <ShieldX className="h-4 w-4" /> Not Allowed
            </Button>
          </div>
          {!allowedDraft && (
            <FormField label="Reason">
              <Input
                value={reasonDraft}
                onChange={(e) => setReasonDraft(e.target.value)}
                placeholder="Why is this vehicle not allowed to exit?"
              />
            </FormField>
          )}
          <DialogFooter>
            <Button onClick={saveExitAccess} disabled={setAllowedToExit.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trips">Trips</TabsTrigger>
          <TabsTrigger value="fuel">Fuel</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="tyres">Tyres</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoCard title="Make / Model" value={`${vehicle.make} ${vehicle.model} ${vehicle.variant ?? ""}`} />
            <InfoCard title="Year / Colour" value={`${vehicle.year} · ${vehicle.colour}`} />
            <InfoCard title="Fuel Type" value={vehicle.fuelType} />
            <InfoCard title="Company" value={vehicle.company} />
            <InfoCard title="Department" value={vehicle.departmentCostCentre ?? "—"} />
            <InfoCard title="Expected Fuel Average" value={`${vehicle.expectedFuelAverageKmpl} KM/L`} />
            {vehicle.seatingCapacity != null && (
              <InfoCard title="Seating Capacity" value={`${vehicle.seatingCapacity}`} />
            )}
            {vehicle.transmission && <InfoCard title="Transmission" value={vehicle.transmission} />}
            {vehicle.driveType && <InfoCard title="Drive Type" value={vehicle.driveType} />}
            {vehicle.bodyType && <InfoCard title="Body Type" value={vehicle.bodyType} />}
            {vehicle.oilChangeKm != null && (
              <InfoCard title="Oil Change Every" value={`${formatKm(vehicle.oilChangeKm)}`} />
            )}
            {vehicle.tyreChangeKm != null && (
              <InfoCard title="Tyre Change Due After" value={`${formatKm(vehicle.tyreChangeKm)}`} />
            )}
          </div>
        </TabsContent>

        <TabsContent value="trips">
          <ListCard
            title="Trip History"
            items={vehicleTrips}
            empty="No trips recorded for this vehicle yet."
            render={(t) => (
              <>
                <p className="font-medium">
                  {t.tripNumber} · {t.purpose} → {t.destination}
                </p>
                <p className="text-muted-foreground">
                  {formatDateTime(t.outTime)} {t.tripKm != null && `· ${formatKm(t.tripKm)}`}
                </p>
              </>
            )}
          />
        </TabsContent>

        <TabsContent value="fuel">
          <ListCard
            title="Fuel Entries"
            items={vehicleFuel}
            empty="No fuel entries recorded for this vehicle yet."
            render={(f) => (
              <>
                <p className="font-medium">
                  {f.litres} L · {formatCurrency(f.total)} · {f.fuelStation}
                </p>
                <p className="text-muted-foreground">{formatDateTime(f.dateTime)} · Odometer {formatKm(f.odometer)}</p>
              </>
            )}
          />
        </TabsContent>

        <TabsContent value="maintenance">
          <ListCard
            title="Maintenance History"
            items={vehicleMaintenance}
            empty="No maintenance records for this vehicle yet."
            render={(m) => (
              <>
                <p className="font-medium">
                  {m.categories.join(", ")} · {formatCurrency(m.totalCost)}
                </p>
                <p className="text-muted-foreground">
                  {formatDate(m.date)} · {m.workshop} · Odometer {formatKm(m.odometer)}
                </p>
              </>
            )}
          />
        </TabsContent>

        <TabsContent value="tyres">
          <ListCard
            title="Tyres"
            items={vehicleTyres}
            empty="No tyres tracked for this vehicle yet."
            render={(t) => (
              <>
                <p className="font-medium">
                  {t.tyreCode} · {t.brand} {t.size} · {t.wheelPosition}
                </p>
                <p className="text-muted-foreground">
                  {formatKm(t.mileage ?? 0)} used · {formatKm(t.remainingKm ?? t.expectedLifeKm)} remaining
                </p>
              </>
            )}
          />
        </TabsContent>

        <TabsContent value="documents">
          <ListCard
            title="Documents"
            items={vehicleDocuments}
            empty="No documents on file for this vehicle yet."
            render={(d) => (
              <div className="flex w-full items-center justify-between">
                <div>
                  <p className="font-medium">{documentTypes.find((t) => t.id === d.documentTypeId)?.name ?? "—"}</p>
                  <p className="text-muted-foreground">Expires {formatDate(d.expiryDate)}</p>
                </div>
                {d.documentAlertStatus && <StatusBadge status={d.documentAlertStatus} />}
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="costs">
          <div className="grid gap-4 sm:grid-cols-3">
            <InfoCard title="Total Fuel Cost" value={formatCurrency(totalFuelCost)} />
            <InfoCard title="Total Maintenance Cost" value={formatCurrency(totalMaintenanceCost)} />
            <InfoCard title="Cost per KM" value={formatCurrency(Math.round(costPerKm))} />
          </div>
        </TabsContent>

        <TabsContent value="photos">
          <div className="grid gap-4 sm:grid-cols-3">
            <PhotoCapture label="Front View" />
            <PhotoCapture label="Rear View" />
            <PhotoCapture label="Side View" />
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <ListCard
            title="Audit History"
            items={auditLog}
            empty="No audit entries yet."
            render={(a) => (
              <>
                <p className="font-medium">{a.transaction}</p>
                <p className="text-muted-foreground">
                  {a.user} · {formatDateTime(a.timestamp)}
                  {a.reason && ` · ${a.reason}`}
                </p>
              </>
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-lg font-semibold capitalize">{value}</CardContent>
    </Card>
  );
}

function ListCard<T>({
  title,
  items,
  empty,
  render,
}: {
  title: string;
  items: T[];
  empty: string;
  render: (item: T) => React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.length === 0 && <EmptyState title={empty} />}
        {items.map((item, i) => (
          <div key={i} className="rounded-md border border-border p-3 text-sm">
            {render(item)}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
