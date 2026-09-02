import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { QrScanInput } from "@/components/shared/qr-scan-input";
import { PhotoCapture } from "@/components/shared/photo-capture";
import { getVehicleByCode } from "@/services/vehicles.service";
import { listDrivers } from "@/services/drivers.service";
import { useCreateFuelEntry } from "@/features/fuel/hooks";
import { formatCurrency, formatKm } from "@/lib/formatters";
import type { Driver, Vehicle } from "@/types";

const PAYMENT_METHODS = ["Cash", "Credit", "Fuel Card", "Company Account", "Driver Paid", "Other"];

export function FuelEntryForm({ onSaved }: { onSaved?: () => void }) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverId, setDriverId] = useState("");
  const [odometer, setOdometer] = useState("");
  const [litres, setLitres] = useState("");
  const [rate, setRate] = useState("");
  const [fuelStation, setFuelStation] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [fullTank, setFullTank] = useState(true);

  const createFuelEntry = useCreateFuelEntry();
  const total = (Number(litres) || 0) * (Number(rate) || 0);

  async function handleScan(code: string) {
    const found = await getVehicleByCode(code);
    if (!found) {
      toast.error("Vehicle not found for that code.");
      return;
    }
    setVehicle(found);
    setOdometer(String(found.currentOdometer));
    if (!drivers.length) setDrivers(await listDrivers());
  }

  async function handleSave() {
    if (!vehicle || !driverId || !litres || !rate || !fuelStation || !paymentMethod) {
      toast.error("Please complete all required fields.");
      return;
    }
    await createFuelEntry.mutateAsync({
      vehicleId: vehicle.id,
      driverId,
      odometer: Number(odometer),
      fuelType: vehicle.fuelType,
      litres: Number(litres),
      ratePerLitre: Number(rate),
      fuelStation,
      paymentMethod,
      fullTank,
    });
    toast.success("Fuel entry recorded.");
    setVehicle(null);
    setDriverId("");
    setOdometer("");
    setLitres("");
    setRate("");
    setFuelStation("");
    setPaymentMethod("");
    onSaved?.();
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Vehicle</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <QrScanInput placeholder="Scan or type vehicle code" onScan={handleScan} />
          {vehicle && (
            <p className="text-sm text-muted-foreground">
              {vehicle.registrationNumber} · {vehicle.make} {vehicle.model} · Last odometer {formatKm(vehicle.currentOdometer)}
            </p>
          )}
        </CardContent>
      </Card>

      {vehicle && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Fuel Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Driver</Label>
                <Select value={driverId} onValueChange={setDriverId}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Odometer (KM)</Label>
                <Input className="h-12 text-base" type="number" value={odometer} onChange={(e) => setOdometer(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Litres</Label>
                <Input className="h-12 text-base" type="number" value={litres} onChange={(e) => setLitres(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Rate / Litre</Label>
                <Input className="h-12 text-base" type="number" value={rate} onChange={(e) => setRate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Fuel Station</Label>
                <Input className="h-12 text-base" value={fuelStation} onChange={(e) => setFuelStation(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Checkbox id="fullTank" checked={fullTank} onCheckedChange={(v) => setFullTank(v === true)} />
                <Label htmlFor="fullTank">Full tank</Label>
              </div>
              <p className="text-sm font-medium sm:col-span-2">Total: {formatCurrency(total)}</p>
            </CardContent>
          </Card>

          <PhotoCapture label="Fuel receipt" />

          <Button size="touch" className="w-full" onClick={handleSave} disabled={createFuelEntry.isPending}>
            Save Fuel Entry
          </Button>
        </>
      )}
    </div>
  );
}
