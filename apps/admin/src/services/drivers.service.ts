import type { Driver } from "@/types";
import { ApiError, apiGet, apiList, apiPost } from "@/lib/api-client";

export async function listDrivers(): Promise<Driver[]> {
  const drivers = await apiList<WireDriver>("/drivers/");
  return drivers.map(fromWireDriver);
}

export type CreateDriverPayload = Omit<Driver, "id" | "employeeId" | "status"> & { status?: Driver["status"] };

export async function createDriver(payload: CreateDriverPayload): Promise<Driver> {
  const driver = await apiPost<WireDriver>("/drivers/", toWireDriver(payload));
  return fromWireDriver(driver);
}

export async function getDriver(id: string): Promise<Driver | undefined> {
  const driver = await apiGet<WireDriver>(`/drivers/${id}/`);
  return fromWireDriver(driver);
}

export async function getDriverByCode(code: string): Promise<Driver | undefined> {
  try {
    const driver = await apiGet<WireDriver>(`/drivers/by-code/${encodeURIComponent(code)}/`);
    return fromWireDriver(driver);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

export function licenceStatus(licenceExpiry: string): "valid" | "expiring_soon" | "expired" {
  const days = Math.floor((new Date(licenceExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "expired";
  if (days <= 30) return "expiring_soon";
  return "valid";
}

/** The wire shape has the 4 "other details" booleans flat on the Driver object;
 * the app's Driver type nests them under otherDetails. Mapped here so the rest of
 * the UI (driver form/list) never has to know the wire shape differs. */
type OtherDetails = NonNullable<Driver["otherDetails"]>;
type WireDriver = Omit<Driver, "otherDetails"> & Partial<OtherDetails>;

function fromWireDriver(wire: WireDriver): Driver {
  const { uniformIssued, idCardIssued, rfidAccessCard, nightDutyAllowed, ...rest } = wire;
  return { ...rest, otherDetails: { uniformIssued, idCardIssued, rfidAccessCard, nightDutyAllowed } };
}

function toWireDriver<T extends { otherDetails?: Driver["otherDetails"] }>(
  payload: T,
): Omit<T, "otherDetails"> & Partial<OtherDetails> {
  const { otherDetails, ...rest } = payload;
  return { ...rest, ...otherDetails };
}
