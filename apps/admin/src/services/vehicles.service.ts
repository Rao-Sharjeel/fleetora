import type { Vehicle } from "@/types";
import { getDb, delay, commit, nextId } from "@/services/mock/db";

export async function listVehicles(): Promise<Vehicle[]> {
  return delay([...getDb().vehicles]);
}

export type CreateVehiclePayload = Omit<Vehicle, "id" | "internalId" | "qrCode" | "status" | "allowedToExit"> & {
  status?: Vehicle["status"];
  allowedToExit?: boolean;
};

export async function createVehicle(payload: CreateVehiclePayload): Promise<Vehicle> {
  const db = getDb();
  const seq = db.vehicles.length + 1;
  const internalId = `VEH-${String(seq).padStart(3, "0")}`;
  const vehicle: Vehicle = {
    ...payload,
    id: nextId("veh"),
    internalId,
    qrCode: `QR-${internalId}`,
    status: payload.status ?? "available",
    allowedToExit: payload.allowedToExit ?? true,
  };
  db.vehicles.push(vehicle);
  commit();
  return delay(vehicle);
}

export async function getVehicle(id: string): Promise<Vehicle | undefined> {
  return delay(getDb().vehicles.find((v) => v.id === id));
}

export async function getVehicleByCode(code: string): Promise<Vehicle | undefined> {
  const db = getDb();
  return delay(
    db.vehicles.find((v) => v.qrCode === code || v.registrationNumber === code || v.internalId === code),
  );
}

/** Mirrors what was previously an unpersisted UI-only toggle on the gate-out screen. */
export async function setAllowedToExit(
  vehicleId: string,
  allowed: boolean,
  reason: string | undefined,
  updatedBy: string,
): Promise<Vehicle> {
  if (!allowed && !reason) {
    throw new Error("A reason is required when marking a vehicle not allowed to exit.");
  }
  const db = getDb();
  const vehicle = db.vehicles.find((v) => v.id === vehicleId);
  if (!vehicle) throw new Error("Vehicle not found.");

  vehicle.allowedToExit = allowed;
  vehicle.allowedToExitReason = allowed ? undefined : reason;
  vehicle.allowedToExitUpdatedBy = updatedBy;
  vehicle.allowedToExitUpdatedAt = new Date().toISOString();
  commit();
  return delay(vehicle);
}
