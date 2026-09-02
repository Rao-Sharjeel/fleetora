import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QrScanInput } from "@/components/shared/qr-scan-input";
import { PhotoCapture } from "@/components/shared/photo-capture";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { getVehicleByCode } from "@/services/vehicles.service";
import { getDriverByCode, listDrivers } from "@/services/drivers.service";
import { getGuardByCode } from "@/services/guards.service";
import { useGuards } from "@/features/guards/hooks";
import { useGateOut } from "@/features/trips/hooks";
import { DEPARTMENTS, PURPOSES } from "@/services/mock/fixtures";
import { formatKm } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Driver, Vehicle } from "@/types";

export function GateOutPage() {
  const [guardId, setGuardId] = useState("");
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [odometerOut, setOdometerOut] = useState("");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverId, setDriverId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [destination, setDestination] = useState("");
  const [requestedBy, setRequestedBy] = useState("");
  const [department, setDepartment] = useState("");
  const [expectedReturn, setExpectedReturn] = useState("");
  const [remarks, setRemarks] = useState("");
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [denyReason, setDenyReason] = useState("");
  const [confirmedTrip, setConfirmedTrip] = useState<string | null>(null);

  const { data: guards = [] } = useGuards();
  const gateOut = useGateOut();

  async function handleGuardScan(code: string) {
    const found = await getGuardByCode(code);
    if (!found) {
      toast.error("Guard not found for that code — select manually below.");
      return;
    }
    setGuardId(found.id);
  }

  async function handleVehicleScan(code: string) {
    const found = await getVehicleByCode(code);
    if (!found) {
      toast.error("Vehicle not found for that code.");
      return;
    }
    if (found.status === "outside") {
      toast.error(`${found.registrationNumber} is already outside. Gate-Out is blocked.`);
      return;
    }
    setVehicle(found);
    setOdometerOut(String(found.currentOdometer));
    if (!drivers.length) setDrivers(await listDrivers());
  }

  async function handleDriverScan(code: string) {
    const found = await getDriverByCode(code);
    if (!found) {
      toast.error("Driver not found for that code — select manually below.");
      return;
    }
    setDriverId(found.id);
  }

  async function handleConfirm() {
    if (!vehicle || !driverId || !purpose || !destination || !requestedBy || !department) {
      toast.error("Please complete all required fields before confirming.");
      return;
    }
    if (allowed !== true) {
      toast.error("Vehicle exit must be marked “Allowed to Exit” before confirming.");
      return;
    }
    try {
      const trip = await gateOut.mutateAsync({
        vehicleId: vehicle.id,
        driverId,
        guardId: guardId || undefined,
        odometerOut: Number(odometerOut),
        purpose,
        destination,
        requestedBy,
        department,
        expectedReturn: expectedReturn || undefined,
        remarks: remarks || undefined,
      });
      setConfirmedTrip(trip.tripNumber);
      toast.success(`Gate-Out confirmed — ${trip.tripNumber}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gate-Out failed.");
    }
  }

  function resetForm() {
    setGuardId("");
    setVehicle(null);
    setOdometerOut("");
    setDriverId("");
    setPurpose("");
    setDestination("");
    setRequestedBy("");
    setDepartment("");
    setExpectedReturn("");
    setRemarks("");
    setAllowed(null);
    setDenyReason("");
    setConfirmedTrip(null);
  }

  if (confirmedTrip) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-success" />
          <h2 className="text-lg font-semibold">Vehicle Out Confirmed</h2>
          <p className="text-sm text-muted-foreground">Trip {confirmedTrip} is now open.</p>
          <Button size="touch" onClick={resetForm}>
            New Gate-Out
          </Button>
        </CardContent>
      </Card>
    );
  }

  const guard = guards.find((g) => g.id === guardId);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>1. Guard on Duty</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <QrScanInput placeholder="Scan or type guard ID (e.g. GRD-1025)" onScan={handleGuardScan} />
          <Select value={guardId} onValueChange={setGuardId}>
            <SelectTrigger className="h-12 text-base">
              <SelectValue placeholder="Or select guard manually" />
            </SelectTrigger>
            <SelectContent>
              {guards.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name} ({g.guardId})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {guard && (
            <div className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
              <div>
                <p className="font-medium">
                  {guard.name} · {guard.guardId}
                </p>
                <p className="text-muted-foreground">{guard.department ?? "Security"} · {guard.dutyShift ?? "Duty shift not set"}</p>
              </div>
              <Badge variant={guard.status === "active" ? "success" : "muted"} dot={false}>
                {guard.status === "active" ? "Active" : "Inactive"}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {guard && (
      <Card>
        <CardHeader>
          <CardTitle>2. Scan Vehicle</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <QrScanInput placeholder="Scan or type vehicle code (e.g. LEA-1234)" onScan={handleVehicleScan} />
          {vehicle && (
            <div className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
              <div>
                <p className="font-medium">
                  {vehicle.registrationNumber} · {vehicle.make} {vehicle.model}
                </p>
                <p className="text-muted-foreground">Last odometer: {formatKm(vehicle.currentOdometer)}</p>
              </div>
              <StatusBadge status={vehicle.status} />
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {vehicle && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>3. Odometer OUT</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <PhotoCapture label="Odometer photo" required />
              <div className="flex flex-col gap-1.5">
                <Label>Odometer reading (KM)</Label>
                <Input
                  type="number"
                  className="h-12 text-base"
                  value={odometerOut}
                  onChange={(e) => setOdometerOut(e.target.value)}
                />
                {Number(odometerOut) < vehicle.currentOdometer && (
                  <span className="flex items-center gap-1 text-xs text-destructive">
                    <ShieldAlert className="h-3 w-3" /> Below last validated reading — requires authorized override.
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Driver</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <QrScanInput placeholder="Scan company ID or type employee ID" onScan={handleDriverScan} />
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Or select driver manually" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} ({d.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <PhotoCapture label="Driver ID photo" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Trip Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Purpose</Label>
                <Select value={purpose} onValueChange={setPurpose}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    {PURPOSES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Destination</Label>
                <Input className="h-12 text-base" value={destination} onChange={(e) => setDestination(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Requested By</Label>
                <Input className="h-12 text-base" value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Department</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Expected Return (optional)</Label>
                <Input type="datetime-local" className="h-12 text-base" value={expectedReturn} onChange={(e) => setExpectedReturn(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label>Remarks</Label>
                <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Is Vehicle Allowed to Exit?</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setAllowed(true)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border px-4 py-4 text-sm font-semibold transition-colors",
                    allowed === true
                      ? "border-transparent bg-success text-success-foreground"
                      : "border-border hover:bg-muted",
                  )}
                >
                  <ShieldCheck className="h-5 w-5" /> Allowed to Exit
                </button>
                <button
                  type="button"
                  onClick={() => setAllowed(false)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border px-4 py-4 text-sm font-semibold transition-colors",
                    allowed === false
                      ? "border-transparent bg-destructive text-destructive-foreground"
                      : "border-border hover:bg-muted",
                  )}
                >
                  <ShieldX className="h-5 w-5" /> Not Allowed
                </button>
              </div>
              {allowed === false && (
                <div className="flex flex-col gap-1.5">
                  <Label>Reason / Contact Transport Incharge</Label>
                  <Input
                    value={denyReason}
                    onChange={(e) => setDenyReason(e.target.value)}
                    placeholder="Why is this vehicle not allowed to exit?"
                  />
                  <p className="text-xs text-destructive">
                    Vehicle Out cannot be confirmed while marked “Not Allowed”. Contact the Transport Incharge.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Button size="touch" className="w-full" onClick={handleConfirm} disabled={gateOut.isPending || allowed !== true}>
            Confirm Vehicle Out
          </Button>
        </>
      )}
    </div>
  );
}
