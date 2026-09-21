import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
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
import { getDriverByCode } from "@/services/drivers.service";
import { getGuardByCode } from "@/services/guards.service";
import { getPlannedTripForVehicle } from "@/services/trips.service";
import { useGuards } from "@/features/guards/hooks";
import { useGateOut } from "@/features/trips/hooks";
import { formatKm } from "@/lib/formatters";
import type { Driver, Trip, Vehicle } from "@/types";

/**
 * The office's own Gate-Out screen (for staff with gate.exit, not the exit
 * kiosk). Same rule as the kiosk now: nothing here originates a trip — it
 * only confirms one the Transport Incharge already planned (Trip Register),
 * and only for the driver named on that plan. See fleet.serializers.GateOutSerializer.
 */
export function GateOutPage() {
  const [guardId, setGuardId] = useState("");
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [plan, setPlan] = useState<Trip | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [odometerOut, setOdometerOut] = useState("");
  const [driverId, setDriverId] = useState("");
  const [driverMismatch, setDriverMismatch] = useState<Driver | null>(null);
  const [confirmedTrip, setConfirmedTrip] = useState<string | null>(null);
  const [checkingVehicle, setCheckingVehicle] = useState(false);

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
      setVehicle(found);
      setBlocked(`${found.registrationNumber} is already outside. Gate-Out is blocked.`);
      return;
    }
    if (!found.allowedToExit) {
      setVehicle(found);
      setBlocked(
        `${found.registrationNumber} is not allowed to exit` +
          (found.allowedToExitReason ? ` (${found.allowedToExitReason})` : "") +
          ".",
      );
      return;
    }

    setCheckingVehicle(true);
    try {
      const { trip, expired } = await getPlannedTripForVehicle(found.id);
      if (!trip) {
        setVehicle(found);
        setBlocked(
          expired
            ? `The planned trip for ${found.registrationNumber} has expired. Plan a new one in Trip Register.`
            : `No trip is authorized for ${found.registrationNumber}. Plan one in Trip Register first.`,
        );
        return;
      }
      setVehicle(found);
      setPlan(trip);
      setOdometerOut(String(found.currentOdometer));
      // Deliberately not pre-filled from the plan — Confirm must stay locked
      // until the driver actually scans in and matches, or a mismatch could
      // leave the button enabled from this default alone.
    } finally {
      setCheckingVehicle(false);
    }
  }

  async function handleDriverScan(code: string) {
    const found = await getDriverByCode(code);
    if (!found) {
      toast.error("Driver not found for that code.");
      return;
    }
    if (plan && found.id !== plan.driverId) {
      // Clears any earlier confirmed match too — a later mismatched scan
      // must re-lock Confirm, not leave it enabled from a prior good scan.
      setDriverId("");
      setDriverMismatch(found);
      return;
    }
    setDriverMismatch(null);
    setDriverId(found.id);
    toast.success(`Confirmed — ${found.name}.`);
  }

  async function handleConfirm() {
    if (!vehicle || !plan || !driverId) return;
    try {
      const trip = await gateOut.mutateAsync({
        vehicleId: vehicle.id,
        driverId,
        guardId: guardId || undefined,
        odometerOut: Number(odometerOut),
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
    setPlan(null);
    setBlocked(null);
    setOdometerOut("");
    setDriverId("");
    setDriverMismatch(null);
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

      {guard && !plan && (
        <Card>
          <CardHeader>
            <CardTitle>2. Scan Vehicle</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <QrScanInput placeholder="Scan or type vehicle code (e.g. LEA-1234)" onScan={handleVehicleScan} />
            {checkingVehicle && <p className="text-sm text-muted-foreground">Checking for a planned trip…</p>}
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
            {blocked && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p>{blocked}</p>
                  <button
                    type="button"
                    className="mt-1 text-xs underline"
                    onClick={() => {
                      setVehicle(null);
                      setBlocked(null);
                    }}
                  >
                    Try a different vehicle
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {vehicle && plan && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>3. Trip Authorized</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              <p>
                <span className="text-muted-foreground">Assigned Driver:</span> {plan.driverName}
              </p>
              <p>
                <span className="text-muted-foreground">Purpose:</span> {plan.purpose}
              </p>
              <p>
                <span className="text-muted-foreground">Destination:</span> {plan.destination}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Confirm Driver</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Scan the driver's ID card — the vehicle can only leave with {plan.driverName}.
              </p>
              <QrScanInput placeholder="Scan company ID or type employee ID" onScan={handleDriverScan} />
              {driverMismatch && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Scanned {driverMismatch.name}, but this trip is assigned to {plan.driverName}. Exit is blocked —
                    ask the Transport Incharge to update the plan if the driver has genuinely changed.
                  </p>
                </div>
              )}
              {!driverMismatch && driverId === plan.driverId && (
                <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4 shrink-0" /> Driver confirmed — {plan.driverName}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Odometer OUT</CardTitle>
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

          <Button
            size="touch"
            className="w-full"
            onClick={handleConfirm}
            disabled={!driverId || driverId !== plan.driverId || !odometerOut}
            loading={gateOut.isPending}
            loadingText="Confirming…"
          >
            Confirm Vehicle Out
          </Button>
        </>
      )}
    </div>
  );
}
