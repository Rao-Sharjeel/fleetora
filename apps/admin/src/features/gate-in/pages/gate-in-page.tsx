import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrScanInput } from "@/components/shared/qr-scan-input";
import { PhotoCapture } from "@/components/shared/photo-capture";
import { getVehicleByCode } from "@/services/vehicles.service";
import { getOpenTripForVehicle, formatDuration } from "@/services/trips.service";
import { useGateIn } from "@/features/trips/hooks";
import { formatKm, formatTime } from "@/lib/formatters";
import type { ReturnCondition, Trip, Vehicle } from "@/types";

const CONDITIONS: { value: ReturnCondition; label: string }[] = [
  { value: "ok", label: "Vehicle OK" },
  { value: "maintenance_required", label: "Maintenance Required" },
  { value: "damage_incident", label: "Damage / Incident" },
];

export function GateInPage() {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [odometerIn, setOdometerIn] = useState("");
  const [condition, setCondition] = useState<ReturnCondition>("ok");
  const [remarks, setRemarks] = useState("");
  const [completed, setCompleted] = useState(false);

  const gateIn = useGateIn();

  async function handleScan(code: string) {
    const found = await getVehicleByCode(code);
    if (!found) {
      toast.error("Vehicle not found for that code.");
      return;
    }
    const openTrip = getOpenTripForVehicle(found.id);
    if (!openTrip) {
      toast.error(`No open trip found for ${found.registrationNumber}.`);
      return;
    }
    setVehicle(found);
    setTrip(openTrip);
  }

  async function handleComplete() {
    if (!vehicle || !trip) return;
    try {
      await gateIn.mutateAsync({
        vehicleId: vehicle.id,
        odometerIn: Number(odometerIn),
        returnCondition: condition,
        remarks: remarks || undefined,
      });
      setCompleted(true);
      toast.success("Gate-In completed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gate-In failed.");
    }
  }

  function resetForm() {
    setVehicle(null);
    setTrip(null);
    setOdometerIn("");
    setCondition("ok");
    setRemarks("");
    setCompleted(false);
  }

  if (completed && trip) {
    const km = Number(odometerIn) - trip.odometerOut;
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-success" />
          <h2 className="text-lg font-semibold">Vehicle In Confirmed</h2>
          <p className="text-sm text-muted-foreground">
            Trip {trip.tripNumber} completed · {formatKm(km)} travelled.
          </p>
          <Button size="touch" onClick={resetForm}>
            New Gate-In
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Scan Vehicle</CardTitle>
        </CardHeader>
        <CardContent>
          <QrScanInput placeholder="Scan or type vehicle code" onScan={handleScan} />
        </CardContent>
      </Card>

      {vehicle && trip && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Open Trip</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Trip No." value={trip.tripNumber} />
              <Info label="Out Time" value={formatTime(trip.outTime)} />
              <Info label="Odometer Out" value={formatKm(trip.odometerOut)} />
              <Info label="Duration So Far" value={formatDuration(trip.outTime)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Closing Odometer</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <PhotoCapture label="Odometer photo" required />
              <div className="flex flex-col gap-1.5">
                <Label>Odometer reading (KM)</Label>
                <Input
                  type="number"
                  className="h-12 text-base"
                  value={odometerIn}
                  onChange={(e) => setOdometerIn(e.target.value)}
                />
                {odometerIn && Number(odometerIn) >= trip.odometerOut && (
                  <span className="text-xs text-muted-foreground">
                    Trip KM: {formatKm(Number(odometerIn) - trip.odometerOut)}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Return Condition</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {CONDITIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCondition(c.value)}
                    className={`rounded-lg border px-3 py-3 text-sm font-medium transition-colors ${
                      condition === c.value
                        ? "border-transparent bg-primary text-primary-foreground"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Remarks</Label>
                <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Button size="touch" className="w-full" onClick={handleComplete} disabled={gateIn.isPending}>
            Complete Gate-In
          </Button>
        </>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
