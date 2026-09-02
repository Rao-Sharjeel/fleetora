import type { Driver } from "@/types";
import { getDb, delay, commit, nextId } from "@/services/mock/db";

export async function listDrivers(): Promise<Driver[]> {
  return delay([...getDb().drivers]);
}

export type CreateDriverPayload = Omit<Driver, "id" | "employeeId" | "status"> & { status?: Driver["status"] };

export async function createDriver(payload: CreateDriverPayload): Promise<Driver> {
  const db = getDb();
  const seq = db.drivers.length + 101;
  const driver: Driver = {
    ...payload,
    id: nextId("drv"),
    employeeId: `EMP-${seq}`,
    status: payload.status ?? "active",
  };
  db.drivers.push(driver);
  commit();
  return delay(driver);
}

export async function getDriver(id: string): Promise<Driver | undefined> {
  return delay(getDb().drivers.find((d) => d.id === id));
}

export async function getDriverByCode(code: string): Promise<Driver | undefined> {
  const db = getDb();
  return delay(db.drivers.find((d) => d.employeeId === code || d.companyIdCode === code));
}

export function licenceStatus(licenceExpiry: string): "valid" | "expiring_soon" | "expired" {
  const days = Math.floor((new Date(licenceExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "expired";
  if (days <= 30) return "expiring_soon";
  return "valid";
}
