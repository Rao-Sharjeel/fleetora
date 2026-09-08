import { useNavigate, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { InfoCard, ListCard } from "@/components/shared/profile-cards";
import { useDriver, useDeleteDriver } from "@/features/drivers/hooks";
import { DriverFormDialog } from "@/features/drivers/components/driver-form-dialog";
import { useVehicle } from "@/features/vehicles/hooks";
import { useTrips } from "@/features/trips/hooks";
import { useFuelEntries } from "@/features/fuel/hooks";
import { useDocuments } from "@/features/documents/hooks";
import { useMasterCollection } from "@/features/master-data/hooks";
import { useSession } from "@/hooks/use-session";
import { licenceStatus } from "@/services/drivers.service";
import { formatCurrency, formatDate, formatDateTime, formatKm } from "@/lib/formatters";

export function DriverProfilePage() {
  const { driverId } = useParams<{ driverId: string }>();
  const navigate = useNavigate();
  const role = useSession((s) => s.role);
  const { data: driver } = useDriver(driverId);
  const { data: assignedVehicle } = useVehicle(driver?.assignedVehicleId);
  const { data: trips = [] } = useTrips();
  const { data: fuelEntries = [] } = useFuelEntries();
  const { data: documents = [] } = useDocuments();
  const { data: documentTypes = [] } = useMasterCollection("documentTypes");
  const deleteDriver = useDeleteDriver();

  if (!driver) return <p className="text-sm text-muted-foreground">Loading driver…</p>;

  const canWrite = role === "admin" || role === "fleet_manager";

  const driverTrips = trips.filter((t) => t.driverId === driver.id);
  const driverFuel = fuelEntries.filter((f) => f.driverId === driver.id);
  const driverDocuments = documents.filter((d) => d.ownerType === "driver" && d.ownerId === driver.id);

  const completedTrips = driverTrips.filter((t) => t.status === "completed");
  const openTrips = driverTrips.filter((t) => t.status === "open");
  const totalKm = completedTrips.reduce((sum, t) => sum + (t.tripKm ?? 0), 0);
  const totalFuelCost = driverFuel.reduce((sum, f) => sum + f.total, 0);

  async function handleDelete() {
    if (!driver) return;
    if (!window.confirm(`Delete "${driver.name}"? This can't be undone.`)) return;
    try {
      await deleteDriver.mutateAsync(driver.id);
      toast.success(`${driver.name} deleted.`);
      navigate("/drivers");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete driver.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={driver.photoUrl} alt={driver.name} />
            <AvatarFallback>{driver.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">{driver.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {driver.employeeId} · {driver.department} · Licence {driver.licenceNumber}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={driver.status === "active" ? "success" : "muted"} dot={false}>
            {driver.status === "active" ? "Active" : "Inactive"}
          </Badge>
          {canWrite && (
            <>
              <DriverFormDialog mode="edit" driver={driver} />
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteDriver.isPending}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="trips">Trips</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="h-48 w-48 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
              {driver.photoUrl ? (
                <img src={driver.photoUrl} alt={driver.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-5xl font-semibold text-muted-foreground">
                  {driver.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoCard title="Company ID" value={driver.companyIdCode} />
              <InfoCard title="CNIC" value={driver.cnic} />
              <InfoCard title="Mobile" value={driver.mobile} />
              <InfoCard title="Licence Category" value={driver.licenceCategory} />
              <InfoCard title="Licence Expiry" value={formatDate(driver.licenceExpiry)} />
              <InfoCard title="Licence Status" value={licenceStatus(driver.licenceExpiry).replace("_", " ")} />
              <InfoCard
                title="Assigned Vehicle"
                value={assignedVehicle ? `${assignedVehicle.registrationNumber} · ${assignedVehicle.make} ${assignedVehicle.model}` : "Unassigned"}
              />
              {driver.emergencyContact && <InfoCard title="Emergency Contact" value={driver.emergencyContact} />}
              {driver.fatherHusbandName && <InfoCard title="Father / Husband Name" value={driver.fatherHusbandName} />}
              {driver.dateOfBirth && <InfoCard title="Date of Birth" value={formatDate(driver.dateOfBirth)} />}
              {driver.gender && <InfoCard title="Gender" value={driver.gender} />}
              {driver.residentialAddress && <InfoCard title="Residential Address" value={driver.residentialAddress} />}
              {driver.dateOfJoining && <InfoCard title="Date of Joining" value={formatDate(driver.dateOfJoining)} />}
              {driver.totalExperienceYears != null && (
                <InfoCard title="Driving Experience" value={`${driver.totalExperienceYears} years`} />
              )}
              {driver.accessLevel && <InfoCard title="Access Level" value={driver.accessLevel} />}
              <InfoCard
                title="Equipment Issued"
                value={
                  [
                    driver.otherDetails?.uniformIssued && "Uniform",
                    driver.otherDetails?.idCardIssued && "ID Card",
                    driver.otherDetails?.rfidAccessCard && "RFID Card",
                    driver.otherDetails?.nightDutyAllowed && "Night Duty",
                  ]
                    .filter(Boolean)
                    .join(", ") || "None"
                }
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoCard title="Total Trips" value={`${driverTrips.length}`} />
            <InfoCard title="Completed Trips" value={`${completedTrips.length}`} />
            <InfoCard title="Open Trips" value={`${openTrips.length}`} />
            <InfoCard title="Total KM Driven" value={formatKm(totalKm)} />
            <InfoCard title="Fuel Entries" value={`${driverFuel.length}`} />
            <InfoCard title="Total Fuel Cost" value={formatCurrency(totalFuelCost)} />
          </div>
        </TabsContent>

        <TabsContent value="trips">
          <ListCard
            title="Trip History"
            items={driverTrips}
            empty="No trips recorded for this driver yet."
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

        <TabsContent value="documents">
          <ListCard
            title="Documents"
            items={driverDocuments}
            empty="No documents on file for this driver yet."
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
      </Tabs>
    </div>
  );
}
