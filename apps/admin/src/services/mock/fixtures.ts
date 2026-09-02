import type {
  Vehicle,
  Driver,
  Trip,
  FuelEntry,
  MaintenanceRecord,
  Tyre,
  DocumentRecord,
  Alert,
  Requisition,
  AuditLogEntry,
  AppUser,
  VehicleTypeMaster,
  VehicleMakeMaster,
  VehicleModelMaster,
  DepartmentMaster,
  VehiclePurposeMaster,
  MaintenanceServiceTypeMaster,
  EngineOilMaster,
  PartConsumableMaster,
  WorkshopVendorMaster,
  CostCenterMaster,
  DrivingLicenceTypeMaster,
  FuelTypeMaster,
  GearOilTypeMaster,
  TyreTypeMaster,
  DocumentTypeMaster,
  LocationSiteMaster,
  GateMaster,
  Guard,
} from "@/types";

export const seedVehicles: Vehicle[] = [
  {
    id: "veh-001",
    internalId: "VEH-001",
    registrationNumber: "LEA-1234",
    company: "Head Office",
    make: "Toyota",
    model: "Hilux",
    variant: "Revo",
    year: 2022,
    colour: "White",
    fuelType: "diesel",
    engineNumber: "2GD-1029384",
    chassisNumber: "MR0FR22G701234567",
    departmentCostCentre: "Sales",
    assignedDriverId: "drv-001",
    expectedFuelAverageKmpl: 10,
    currentOdometer: 134650,
    status: "available",
    qrCode: "QR-VEH-001",
    allowedToExit: true,
  },
  {
    id: "veh-002",
    internalId: "VEH-002",
    registrationNumber: "LEX-7865",
    company: "Head Office",
    make: "Suzuki",
    model: "Cultus",
    year: 2021,
    colour: "Silver",
    fuelType: "petrol",
    departmentCostCentre: "Procurement",
    assignedDriverId: "drv-002",
    expectedFuelAverageKmpl: 14,
    currentOdometer: 83412,
    status: "outside",
    qrCode: "QR-VEH-002",
    allowedToExit: true,
  },
  {
    id: "veh-003",
    internalId: "VEH-003",
    registrationNumber: "LEB-4521",
    company: "Warehouse",
    make: "Honda",
    model: "Civic",
    year: 2020,
    colour: "Black",
    fuelType: "petrol",
    departmentCostCentre: "Admin",
    expectedFuelAverageKmpl: 12,
    currentOdometer: 61200,
    status: "workshop",
    qrCode: "QR-VEH-003",
    allowedToExit: true,
  },
  {
    id: "veh-004",
    internalId: "VEH-004",
    registrationNumber: "LEC-9081",
    company: "Head Office",
    make: "Toyota",
    model: "Corolla",
    year: 2019,
    colour: "Grey",
    fuelType: "petrol",
    expectedFuelAverageKmpl: 13,
    currentOdometer: 98410,
    status: "available",
    qrCode: "QR-VEH-004",
    allowedToExit: true,
  },
];

export const seedDrivers: Driver[] = [
  {
    id: "drv-001",
    employeeId: "EMP-101",
    name: "Muhammad Aslam",
    cnic: "35201-1234567-1",
    mobile: "0300-1234567",
    licenceNumber: "DL-88213",
    licenceCategory: "LTV",
    licenceExpiry: "2027-03-10",
    department: "Transport",
    assignedVehicleId: "veh-001",
    status: "active",
  },
  {
    id: "drv-002",
    employeeId: "EMP-102",
    name: "Imran",
    cnic: "35201-7654321-2",
    mobile: "0301-7654321",
    licenceNumber: "DL-55120",
    licenceCategory: "LTV",
    licenceExpiry: "2026-09-30",
    department: "Procurement",
    assignedVehicleId: "veh-002",
    status: "active",
  },
  {
    id: "drv-003",
    employeeId: "EMP-103",
    name: "Kashif Mahmood",
    cnic: "35201-1122334-3",
    mobile: "0302-1122334",
    licenceNumber: "DL-33021",
    licenceCategory: "HTV",
    licenceExpiry: "2026-10-05",
    department: "Warehouse",
    status: "active",
  },
];

const liveTrips: Trip[] = [
  {
    id: "trp-008541",
    tripNumber: "TRP-2026-008541",
    vehicleId: "veh-002",
    driverId: "drv-002",
    purpose: "Purchase",
    destination: "Shah Alam",
    requestedBy: "Accounts",
    department: "Procurement",
    outTime: new Date(Date.now() - 88 * 60 * 1000).toISOString(),
    odometerOut: 83412,
    status: "open",
  },
  {
    id: "trp-008540",
    tripNumber: "TRP-2026-008540",
    vehicleId: "veh-001",
    driverId: "drv-001",
    purpose: "Bank Work",
    destination: "Gulberg",
    requestedBy: "Finance",
    department: "Finance",
    outTime: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    inTime: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    odometerOut: 134500,
    odometerIn: 134650,
    tripKm: 150,
    status: "completed",
    returnCondition: "ok",
  },
];

const liveFuelEntries: FuelEntry[] = [
  {
    id: "fuel-001",
    vehicleId: "veh-001",
    driverId: "drv-001",
    dateTime: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    odometer: 134500,
    fuelType: "diesel",
    litres: 45,
    ratePerLitre: 289,
    total: 45 * 289,
    fuelStation: "PSO Gulberg",
    paymentMethod: "Fuel Card",
    fullTank: true,
  },
  {
    id: "fuel-002",
    vehicleId: "veh-002",
    driverId: "drv-002",
    dateTime: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    odometer: 83000,
    fuelType: "petrol",
    litres: 30,
    ratePerLitre: 272,
    total: 30 * 272,
    fuelStation: "Shell Model Town",
    paymentMethod: "Cash",
    fullTank: true,
  },
];

/*
 * Two weeks of prior activity so the dashboard trend charts have something
 * real to plot. Deterministic (seeded from day offsets, not Math.random) so
 * the same demo data renders on every load — weekday/weekend trip volume
 * varies with the actual calendar day-of-week for a believable shape.
 */
const VEHICLE_IDS = seedVehicles.map((v) => v.id);
const DRIVER_FOR_VEHICLE: Record<string, string> = {
  "veh-001": "drv-001",
  "veh-002": "drv-002",
  "veh-003": "drv-003",
  "veh-004": "drv-003",
};
const FUEL_RATE: Record<string, number> = { diesel: 289, petrol: 272, other: 280 };
const TRIP_TEMPLATES = [
  { purpose: "Customer Visit", destination: "DHA Phase 5", department: "Sales", requestedBy: "Sales" },
  { purpose: "Bank Work", destination: "Gulberg", department: "Finance", requestedBy: "Finance" },
  { purpose: "Supplier Visit", destination: "Kot Lakhpat", department: "Procurement", requestedBy: "Procurement" },
  { purpose: "Staff Transport", destination: "Head Office", department: "Admin", requestedBy: "Admin" },
  { purpose: "Delivery", destination: "Multan Road", department: "Warehouse", requestedBy: "Warehouse" },
  { purpose: "Airport", destination: "Allama Iqbal Airport", department: "Admin", requestedBy: "Management" },
];

function isoAt(daysAgo: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const historicalTrips: Trip[] = [];
let tripSeq = 1;
for (let daysAgo = 13; daysAgo >= 1; daysAgo--) {
  const dow = new Date(isoAt(daysAgo, 12, 0)).getDay();
  const isWeekend = dow === 0 || dow === 6;
  const tripCount = isWeekend ? 1 : 2 + ((daysAgo * 7) % 3);
  for (let i = 0; i < tripCount; i++) {
    const vehicleId = VEHICLE_IDS[(daysAgo + i) % VEHICLE_IDS.length];
    const template = TRIP_TEMPLATES[(daysAgo * 3 + i) % TRIP_TEMPLATES.length];
    const km = 30 + ((daysAgo * 13 + i * 37) % 150);
    const outHour = 8 + ((daysAgo + i) % 6);
    const odometerOut = 55000 + VEHICLE_IDS.indexOf(vehicleId) * 20000 + (13 - daysAgo) * 150 + i * 10;
    historicalTrips.push({
      id: `trp-h${tripSeq}`,
      tripNumber: `TRP-2026-H${String(tripSeq).padStart(4, "0")}`,
      vehicleId,
      driverId: DRIVER_FOR_VEHICLE[vehicleId],
      purpose: template.purpose,
      destination: template.destination,
      requestedBy: template.requestedBy,
      department: template.department,
      outTime: isoAt(daysAgo, outHour, 10),
      inTime: isoAt(daysAgo, outHour + 1 + (i % 2), 40),
      odometerOut,
      odometerIn: odometerOut + km,
      tripKm: km,
      status: "completed",
      returnCondition: "ok",
    });
    tripSeq++;
  }
}

const historicalFuelEntries: FuelEntry[] = [];
let fuelSeq = 1;
for (let daysAgo = 13; daysAgo >= 1; daysAgo--) {
  if (daysAgo % 3 !== 0) continue;
  VEHICLE_IDS.forEach((vehicleId, vi) => {
    if ((daysAgo + vi) % 2 !== 0) return;
    const vehicle = seedVehicles.find((v) => v.id === vehicleId)!;
    const litres = 20 + ((daysAgo * 7 + vi * 11) % 30);
    const rate = FUEL_RATE[vehicle.fuelType];
    historicalFuelEntries.push({
      id: `fuel-h${fuelSeq}`,
      vehicleId,
      driverId: DRIVER_FOR_VEHICLE[vehicleId],
      dateTime: isoAt(daysAgo, 9 + vi, 15),
      odometer: 55000 + vi * 20000 + (13 - daysAgo) * 140,
      fuelType: vehicle.fuelType,
      litres,
      ratePerLitre: rate,
      total: litres * rate,
      fuelStation: vi % 2 === 0 ? "PSO Gulberg" : "Shell Model Town",
      paymentMethod: vi % 2 === 0 ? "Fuel Card" : "Cash",
      fullTank: true,
    });
    fuelSeq++;
  });
}

export const seedTrips: Trip[] = [...liveTrips, ...historicalTrips];
export const seedFuelEntries: FuelEntry[] = [...liveFuelEntries, ...historicalFuelEntries];

export const seedMaintenanceRecords: MaintenanceRecord[] = [
  {
    id: "mnt-001",
    vehicleId: "veh-001",
    date: "2026-08-22",
    odometer: 130150,
    workshop: "Toyota Authorized Workshop",
    categories: ["engine"],
    totalCost: 18500,
    nextDueOdometer: 135150,
    nextDueDate: "2027-02-22",
    remarks: "Engine oil change — Shell Helix HX7 10W-40, 5.5L",
  },
  {
    id: "mnt-002",
    vehicleId: "veh-003",
    date: "2026-07-15",
    odometer: 60000,
    workshop: "City Auto Care",
    categories: ["brakes", "suspension"],
    totalCost: 21600,
  },
];

export const seedTyres: Tyre[] = [
  {
    id: "tyre-001",
    tyreCode: "TYR-0011",
    brand: "Bridgestone",
    size: "265/65R17",
    serialNumber: "BS201938",
    vehicleId: "veh-001",
    wheelPosition: "Front Left",
    installDate: "2025-10-01",
    installOdometer: 126850,
    expectedLifeKm: 40000,
    status: "in_use",
  },
  {
    id: "tyre-002",
    tyreCode: "TYR-0012",
    brand: "Bridgestone",
    size: "265/65R17",
    serialNumber: "BS201939",
    vehicleId: "veh-001",
    wheelPosition: "Front Right",
    installDate: "2025-10-01",
    installOdometer: 126850,
    expectedLifeKm: 40000,
    status: "in_use",
  },
];

export const seedDocuments: DocumentRecord[] = [
  {
    id: "doc-001",
    ownerType: "vehicle",
    ownerId: "veh-001",
    documentType: "Insurance",
    documentNumber: "INS-88213",
    issueDate: "2025-09-01",
    expiryDate: "2026-09-09",
  },
  {
    id: "doc-002",
    ownerType: "vehicle",
    ownerId: "veh-002",
    documentType: "Route Permit",
    expiryDate: "2026-08-30",
  },
  {
    id: "doc-003",
    ownerType: "driver",
    ownerId: "drv-002",
    documentType: "Driving Licence",
    expiryDate: "2026-09-30",
  },
];

export const seedRequisitions: Requisition[] = [
  {
    id: "req-001",
    requisitionNumber: "REQ-2026-0091",
    requestedBy: "Accounts",
    department: "Finance",
    purpose: "Bank Work",
    destination: "Gulberg",
    requiredDateTime: new Date().toISOString(),
    approver: "Fleet Manager",
    status: "approved",
  },
];

export const seedAlerts: Alert[] = [
  {
    id: "alrt-001",
    type: "maintenance",
    severity: "warning",
    message: "LEA-1234 has approximately 500 KM remaining before scheduled engine oil replacement.",
    vehicleId: "veh-001",
    createdAt: new Date().toISOString(),
  },
  {
    id: "alrt-002",
    type: "document",
    severity: "critical",
    message: "LEX-7865 route permit expires in 8 days.",
    vehicleId: "veh-002",
    createdAt: new Date().toISOString(),
  },
  {
    id: "alrt-003",
    type: "fuel_exception",
    severity: "warning",
    message: "LEA-1234 fuel average is 12% below its benchmark this month.",
    vehicleId: "veh-001",
    createdAt: new Date().toISOString(),
  },
];

export const seedAuditLog: AuditLogEntry[] = [
  {
    id: "audit-001",
    user: "Admin",
    timestamp: "2026-08-22T17:43:00Z",
    transaction: "Odometer correction — VEH-001",
    previousValue: "128,578",
    newValue: "128,587",
    reason: "Incorrect manual entry verified from odometer photograph.",
  },
];

export const seedUsers: AppUser[] = [
  { id: "usr-001", name: "Demo Admin", email: "admin@example.com", role: "admin", active: true },
  { id: "usr-002", name: "Fleet Manager", email: "fleet@example.com", role: "fleet_manager", active: true },
  { id: "usr-003", name: "Gate Guard", email: "guard@example.com", role: "gate_guard", active: true },
];

export const PURPOSES = [
  "Bank Work",
  "Customer Visit",
  "Supplier Visit",
  "Purchase",
  "Government Department",
  "FBR",
  "Customs",
  "PRA",
  "SECP",
  "Staff Transport",
  "Factory/Warehouse Transfer",
  "Courier/Documents",
  "Maintenance/Workshop",
  "Airport",
  "Management Duty",
  "Delivery",
  "Collection",
  "Other",
];

export const DEPARTMENTS = ["Accounts", "Finance", "Procurement", "Sales", "Admin", "Warehouse", "Transport"];

/*
 * Master-data seeds below are transcribed directly from the Fleetora master-setup
 * PDFs/mockups (Dynamic Sportswear sample data) so the app's Master Setup screens
 * open with the same reference records the client's mockups show.
 */

export const seedVehicleTypes: VehicleTypeMaster[] = [
  { id: "VT-01", code: "VT-01", name: "Car", description: "Passenger Car / Sedan", status: "active" },
  { id: "VT-02", code: "VT-02", name: "Pickup", description: "Single / Double Cabin", status: "active" },
  { id: "VT-03", code: "VT-03", name: "Van", description: "Mini / Passenger Van", status: "active" },
  { id: "VT-04", code: "VT-04", name: "Bus", description: "Passenger Bus", status: "active" },
  { id: "VT-05", code: "VT-05", name: "Truck", description: "Light / Heavy Duty Truck", status: "active" },
  { id: "VT-06", code: "VT-06", name: "Motorcycle", description: "Two Wheeler", status: "active" },
  { id: "VT-07", code: "VT-07", name: "Forklift", description: "Material Handling Vehicle", status: "active" },
];

export const seedVehicleMakes: VehicleMakeMaster[] = [
  { id: "MAKE-01", code: "MAKE-01", name: "Toyota", country: "Japan", description: "Vehicle Manufacturer", status: "active" },
  { id: "MAKE-02", code: "MAKE-02", name: "Suzuki", country: "Japan", description: "Vehicle Manufacturer", status: "active" },
  { id: "MAKE-03", code: "MAKE-03", name: "Honda", country: "Japan", description: "Vehicle Manufacturer", status: "active" },
  { id: "MAKE-04", code: "MAKE-04", name: "Hino", country: "Japan", description: "Commercial Vehicles", status: "active" },
  { id: "MAKE-05", code: "MAKE-05", name: "Isuzu", country: "Japan", description: "Commercial Vehicles", status: "active" },
  { id: "MAKE-06", code: "MAKE-06", name: "Hyundai", country: "South Korea", description: "Vehicle Manufacturer", status: "active" },
];

export const seedVehicleModels: VehicleModelMaster[] = [
  { id: "MOD-01", code: "MOD-01", name: "Corolla", makeId: "MAKE-01", vehicleTypeId: "VT-01", yearFrom: 2020, status: "active" },
  { id: "MOD-02", code: "MOD-02", name: "Hilux", makeId: "MAKE-01", vehicleTypeId: "VT-02", yearFrom: 2021, status: "active" },
  { id: "MOD-03", code: "MOD-03", name: "Alto", makeId: "MAKE-02", vehicleTypeId: "VT-01", yearFrom: 2019, status: "active" },
  { id: "MOD-04", code: "MOD-04", name: "City", makeId: "MAKE-03", vehicleTypeId: "VT-01", yearFrom: 2021, status: "active" },
  { id: "MOD-05", code: "MOD-05", name: "Dutro", makeId: "MAKE-04", vehicleTypeId: "VT-05", yearFrom: 2020, status: "active" },
  { id: "MOD-06", code: "MOD-06", name: "N-Series", makeId: "MAKE-05", vehicleTypeId: "VT-05", yearFrom: 2020, status: "active" },
];

export const seedDepartmentMasters: DepartmentMaster[] = [
  { id: "DEPT-01", code: "DEPT-01", name: "Administration", description: "Administration Department", status: "active" },
  { id: "DEPT-02", code: "DEPT-02", name: "Sales & Marketing", description: "Sales and Marketing", status: "active" },
  { id: "DEPT-03", code: "DEPT-03", name: "Production", description: "Production Department", status: "active" },
  { id: "DEPT-04", code: "DEPT-04", name: "Warehouse", description: "Warehouse & Logistics", status: "active" },
  { id: "DEPT-05", code: "DEPT-05", name: "Finance", description: "Finance Department", status: "active" },
  { id: "DEPT-06", code: "DEPT-06", name: "HR & Admin", description: "Human Resources & Admin", status: "active" },
  { id: "DEPT-07", code: "DEPT-07", name: "Procurement", description: "Procurement Department", status: "active" },
];

export const seedVehiclePurposes: VehiclePurposeMaster[] = [
  { id: "PUR-01", code: "PUR-01", name: "Official Visit", useType: "Official", approvalLevel: "Department Head", status: "active" },
  { id: "PUR-02", code: "PUR-02", name: "Client Visit", useType: "Official", approvalLevel: "Department Head", status: "active" },
  { id: "PUR-03", code: "PUR-03", name: "Material Collection", useType: "Official", approvalLevel: "Department Head", status: "active" },
  { id: "PUR-04", code: "PUR-04", name: "Delivery / Dispatch", useType: "Official", approvalLevel: "Department Head", status: "active" },
  { id: "PUR-05", code: "PUR-05", name: "Bank / Government Work", useType: "Official", approvalLevel: "Department Head", status: "active" },
  { id: "PUR-06", code: "PUR-06", name: "Personal Use", useType: "Personal", approvalLevel: "CEO / Management", status: "active" },
  { id: "PUR-07", code: "PUR-07", name: "Emergency", useType: "Official", approvalLevel: "Management", status: "active" },
];

export const seedMaintenanceServiceTypes: MaintenanceServiceTypeMaster[] = [
  { id: "MST-01", code: "MST-01", name: "Engine Oil Change", category: "Engine", defaultBasis: "Mileage", status: "active" },
  { id: "MST-02", code: "MST-02", name: "Oil Filter Change", category: "Engine", defaultBasis: "Mileage", status: "active" },
  { id: "MST-03", code: "MST-03", name: "Air Filter Change", category: "Engine", defaultBasis: "Mileage", status: "active" },
  { id: "MST-04", code: "MST-04", name: "Fuel Filter Change", category: "Engine", defaultBasis: "Mileage", status: "active" },
  { id: "MST-05", code: "MST-05", name: "Gear Oil Change", category: "Transmission", defaultBasis: "Mileage", status: "active" },
  { id: "MST-06", code: "MST-06", name: "Brake Service", category: "Brake", defaultBasis: "Mileage / Time", status: "active" },
  { id: "MST-07", code: "MST-07", name: "Tyre Rotation", category: "Tyre", defaultBasis: "Mileage", status: "active" },
  { id: "MST-08", code: "MST-08", name: "Wheel Alignment", category: "Tyre", defaultBasis: "Mileage", status: "active" },
  { id: "MST-09", code: "MST-09", name: "AC Service", category: "Electrical", defaultBasis: "Mileage", status: "active" },
  { id: "MST-10", code: "MST-10", name: "General Service", category: "General", defaultBasis: "Mileage / Time", status: "active" },
];

export const seedEngineOils: EngineOilMaster[] = [
  { id: "OIL-01", code: "OIL-01", name: "Shell 5W-30", brand: "Shell", grade: "5W-30", oilType: "Synthetic", packSize: "4 Ltr", defaultKm: 5000, status: "active" },
  { id: "OIL-02", code: "OIL-02", name: "Mobil 10W-40", brand: "Mobil", grade: "10W-40", oilType: "Semi Synthetic", packSize: "4 Ltr", defaultKm: 5000, status: "active" },
  { id: "OIL-03", code: "OIL-03", name: "Total 15W-40", brand: "Total", grade: "15W-40", oilType: "Mineral", packSize: "4 Ltr", defaultKm: 4000, status: "active" },
  { id: "OIL-04", code: "OIL-04", name: "Castrol 5W-30", brand: "Castrol", grade: "5W-30", oilType: "Synthetic", packSize: "4 Ltr", defaultKm: 5000, status: "active" },
  { id: "OIL-05", code: "OIL-05", name: "ZIC 10W-40", brand: "ZIC", grade: "10W-40", oilType: "Semi Synthetic", packSize: "4 Ltr", defaultKm: 5000, status: "active" },
];

export const seedPartsConsumables: PartConsumableMaster[] = [
  { id: "PRT-01", code: "PRT-01", name: "Oil Filter", category: "Filter", unit: "Nos.", defaultLifeKm: 5000, status: "active" },
  { id: "PRT-02", code: "PRT-02", name: "Air Filter", category: "Filter", unit: "Nos.", defaultLifeKm: 10000, status: "active" },
  { id: "PRT-03", code: "PRT-03", name: "Fuel Filter", category: "Filter", unit: "Nos.", defaultLifeKm: 20000, status: "active" },
  { id: "PRT-04", code: "PRT-04", name: "Spark Plug", category: "Ignition", unit: "Set", defaultLifeKm: 30000, status: "active" },
  { id: "PRT-05", code: "PRT-05", name: "Timing Belt", category: "Engine", unit: "Nos.", defaultLifeKm: 80000, status: "active" },
  { id: "PRT-06", code: "PRT-06", name: "Brake Pads", category: "Brake", unit: "Set", defaultLifeKm: 30000, status: "active" },
  { id: "PRT-07", code: "PRT-07", name: "Wiper Blades", category: "Body", unit: "Set", status: "active" },
];

export const seedWorkshopVendors: WorkshopVendorMaster[] = [
  { id: "VEN-01", code: "VEN-01", name: "ABC Auto Workshop", vendorType: "Workshop", contactPerson: "Service Manager", phone: "0300-1111111", status: "active" },
  { id: "VEN-02", code: "VEN-02", name: "Authorized Toyota Dealer", vendorType: "Dealer", contactPerson: "Service Advisor", phone: "0300-2222222", status: "active" },
  { id: "VEN-03", code: "VEN-03", name: "Tyre Service Center", vendorType: "Tyre Vendor", contactPerson: "Manager", phone: "0300-3333333", status: "active" },
  { id: "VEN-04", code: "VEN-04", name: "Battery Supplier", vendorType: "Parts Vendor", contactPerson: "Sales Officer", phone: "0300-4444444", status: "active" },
  { id: "VEN-05", code: "VEN-05", name: "Lubricant Supplier", vendorType: "Oil Vendor", contactPerson: "Sales Manager", phone: "0300-5555555", status: "active" },
];

export const seedCostCenters: CostCenterMaster[] = [
  { id: "CC-001", code: "CC-001", name: "Administration Fleet", departmentId: "DEPT-01", description: "Admin vehicle expenses", status: "active" },
  { id: "CC-002", code: "CC-002", name: "Sales Fleet", departmentId: "DEPT-02", description: "Sales vehicle expenses", status: "active" },
  { id: "CC-003", code: "CC-003", name: "Production Transport", departmentId: "DEPT-03", description: "Production transport", status: "active" },
  { id: "CC-004", code: "CC-004", name: "Warehouse Logistics", departmentId: "DEPT-04", description: "Warehouse fleet expenses", status: "active" },
  { id: "CC-005", code: "CC-005", name: "Management Vehicles", departmentId: "DEPT-01", description: "Management vehicles", status: "active" },
  { id: "CC-006", code: "CC-006", name: "Project / Special Duty", departmentId: "DEPT-01", description: "Special assignments", status: "active" },
];

export const seedDrivingLicenceTypes: DrivingLicenceTypeMaster[] = [
  { id: "DLT-01", code: "DLT-01", name: "Motor Cycle", description: "Motorcycle licence", defaultValidityYears: 5, status: "active" },
  { id: "DLT-02", code: "DLT-02", name: "Motor Car", description: "Private car licence", defaultValidityYears: 5, status: "active" },
  { id: "DLT-03", code: "DLT-03", name: "LTV", description: "Light Transport Vehicle licence", defaultValidityYears: 5, status: "active" },
  { id: "DLT-04", code: "DLT-04", name: "HTV", description: "Heavy Transport Vehicle licence", defaultValidityYears: 3, status: "active" },
  { id: "DLT-05", code: "DLT-05", name: "PSV", description: "Public Service Vehicle licence", defaultValidityYears: 3, status: "active" },
  { id: "DLT-06", code: "DLT-06", name: "Tractor", description: "Agricultural / tractor licence", defaultValidityYears: 5, status: "active" },
];

export const seedFuelTypeMasters: FuelTypeMaster[] = [
  { id: "FT-01", code: "FT-01", name: "Petrol", unit: "Ltr", description: "Motor petrol", status: "active" },
  { id: "FT-02", code: "FT-02", name: "Diesel", unit: "Ltr", description: "High speed diesel", status: "active" },
  { id: "FT-03", code: "FT-03", name: "CNG", unit: "KG", description: "Compressed Natural Gas", status: "active" },
  { id: "FT-04", code: "FT-04", name: "Hybrid", unit: "Ltr/Unit", description: "Petrol + Electric", status: "inactive" },
  { id: "FT-05", code: "FT-05", name: "Electric", unit: "kWh", description: "Electric Vehicle", status: "inactive" },
];

export const seedGearOilTypes: GearOilTypeMaster[] = [
  { id: "GO-01", code: "GO-01", name: "Petrol", description: "Petroleum based gear oil", status: "active" },
  { id: "GO-02", code: "GO-02", name: "Diesel", description: "Diesel based gear oil", status: "active" },
  { id: "GO-03", code: "GO-03", name: "CNG", description: "CNG compatible gear oil", status: "active" },
];

export const seedTyreTypes: TyreTypeMaster[] = [
  { id: "TYR-01", code: "TYR-01", name: "TYR-20S65R15", brand: "Bridgestone", size: "205/65 R15", typePattern: "Tubeless", plyLoad: "4 Ply", stdLifeKm: 40000, status: "active" },
  { id: "TYR-02", code: "TYR-02", name: "TYR-21S75R16", brand: "Michelin", size: "215/75 R16", typePattern: "Tubeless", plyLoad: "6 Ply", stdLifeKm: 50000, status: "active" },
  { id: "TYR-03", code: "TYR-03", name: "TYR-26S70R17", brand: "Yokohama", size: "265/70 R17", typePattern: "Tubeless", plyLoad: "6 Ply", stdLifeKm: 60000, status: "active" },
  { id: "TYR-04", code: "TYR-04", name: "TYR-22S60R17", brand: "Dunlop", size: "225/60 R17", typePattern: "Tubeless", plyLoad: "4 Ply", stdLifeKm: 45000, status: "active" },
  { id: "TYR-05", code: "TYR-05", name: "TYR-7S016", brand: "General", size: "7.50 R16", typePattern: "Tube Type", plyLoad: "12 Ply", stdLifeKm: 70000, status: "active" },
  { id: "TYR-06", code: "TYR-06", name: "TYR-100020", brand: "Bridgestone", size: "10.00 R20", typePattern: "Tube Type", plyLoad: "14 Ply", stdLifeKm: 80000, status: "active" },
];

export const seedDocumentTypes: DocumentTypeMaster[] = [
  { id: "DOC-01", code: "DOC-01", name: "Registration Book", category: "Vehicle Document", defaultAlertDays: 30, mandatory: true, status: "active" },
  { id: "DOC-02", code: "DOC-02", name: "Insurance Certificate", category: "Vehicle Document", defaultAlertDays: 30, mandatory: true, status: "active" },
  { id: "DOC-03", code: "DOC-03", name: "Fitness Certificate", category: "Vehicle Document", defaultAlertDays: 30, mandatory: true, status: "active" },
  { id: "DOC-04", code: "DOC-04", name: "Route Permit", category: "Vehicle Document", defaultAlertDays: 30, mandatory: true, status: "active" },
  { id: "DOC-05", code: "DOC-05", name: "Token Tax", category: "Vehicle Document", defaultAlertDays: 15, mandatory: true, status: "active" },
  { id: "DOC-06", code: "DOC-06", name: "Emission Certificate", category: "Vehicle Document", defaultAlertDays: 30, mandatory: false, status: "active" },
  { id: "DOC-07", code: "DOC-07", name: "Pollution Certificate", category: "Vehicle Document", defaultAlertDays: 30, mandatory: false, status: "active" },
  { id: "DOC-08", code: "DOC-08", name: "Driver Licence", category: "Driver Document", defaultAlertDays: 15, mandatory: true, status: "active" },
  { id: "DOC-09", code: "DOC-09", name: "CNIC", category: "Driver Document", mandatory: false, status: "active" },
  { id: "DOC-10", code: "DOC-10", name: "Other Document", category: "General", defaultAlertDays: 30, mandatory: false, status: "active" },
];

export const seedLocationSites: LocationSiteMaster[] = [
  { id: "LOC-01", code: "LOC-01", name: "Head Office", address: "5-G, Gulberg III, Lahore", status: "active" },
  { id: "LOC-02", code: "LOC-02", name: "Factory", address: "Main Canal Bank, Chung, Lahore", status: "active" },
  { id: "LOC-03", code: "LOC-03", name: "Warehouse - Kasur", address: "Multan Road, Chung Punjgran, Kasur", status: "active" },
  { id: "LOC-04", code: "LOC-04", name: "Branch Office - Karachi", address: "Shahrah-e-Faisal, Karachi", status: "active" },
  { id: "LOC-05", code: "LOC-05", name: "Branch Office - Multan", address: "Bosan Road, Multan", status: "active" },
];

export const seedGuards: Guard[] = [
  {
    id: "grd-001",
    guardId: "GRD-1025",
    name: "Muhammad Ali",
    cnic: "35201-9876543-1",
    mobile: "0300-9876543",
    department: "Security",
    assignedGateId: "GATE-01",
    dutyShift: "Day (08:00 - 20:00)",
    guardType: "Security Guard",
    authorizedExit: true,
    authorizedIn: true,
    status: "active",
  },
  {
    id: "grd-002",
    guardId: "GRD-1026",
    name: "Ali Hassan",
    cnic: "35201-9876543-2",
    mobile: "0301-9876543",
    department: "Security",
    assignedGateId: "GATE-02",
    dutyShift: "Night (20:00 - 08:00)",
    guardType: "Security Guard",
    authorizedExit: true,
    authorizedIn: true,
    status: "active",
  },
];

export const seedGates: GateMaster[] = [
  { id: "GATE-01", code: "GATE-01", name: "Main Gate", locationId: "LOC-01", description: "Main entrance gate", status: "active" },
  { id: "GATE-02", code: "GATE-02", name: "Factory Gate", locationId: "LOC-02", description: "Factory main gate", status: "active" },
  { id: "GATE-03", code: "GATE-03", name: "Warehouse Gate", locationId: "LOC-03", description: "Warehouse entry gate", status: "active" },
  { id: "GATE-04", code: "GATE-04", name: "Exit Gate", locationId: "LOC-03", description: "Warehouse exit gate", status: "active" },
  { id: "GATE-05", code: "GATE-05", name: "Side Gate", locationId: "LOC-02", description: "Side entry gate", status: "active" },
];
