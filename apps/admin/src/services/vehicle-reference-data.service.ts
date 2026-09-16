import { apiPost } from "@/lib/api-client";

export interface AddVehicleReferenceDataResult {
  typesAdded: string[];
  makesAdded: string[];
  modelsAdded: string[];
  totalAdded: number;
}

/**
 * "Add Standard Vehicle Data" button on the Master Setup screen — adds the
 * common Pakistani-market vehicle types/makes/models (Toyota, Honda, Suzuki,
 * FAW, ...) that aren't already in this tenant's Master Setup.
 *
 * Idempotent on the backend: matches by name, so clicking it again (or on a
 * tenant that already has some of these) only ever adds what's missing.
 */
export async function addVehicleReferenceData(): Promise<AddVehicleReferenceDataResult> {
  return apiPost<AddVehicleReferenceDataResult>("/vehicle-reference-data/add/");
}
