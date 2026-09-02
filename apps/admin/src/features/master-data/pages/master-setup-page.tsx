import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { VehicleTypePage } from "./vehicle-type-page";
import { VehicleMakePage } from "./vehicle-make-page";
import { VehicleModelPage } from "./vehicle-model-page";
import { FuelTypePage } from "./fuel-type-page";
import { GearOilTypePage } from "./gear-oil-type-page";
import { TyreTypePage } from "./tyre-type-page";
import { EngineOilPage } from "./engine-oil-page";
import { DepartmentPage } from "./department-page";
import { VehiclePurposePage } from "./vehicle-purpose-page";
import { CostCenterPage } from "./cost-center-page";
import { LocationSitePage } from "./location-site-page";
import { GatePage } from "./gate-page";
import { MaintenanceServiceTypePage } from "./maintenance-service-type-page";
import { PartsConsumablePage } from "./parts-consumable-page";
import { WorkshopVendorPage } from "./workshop-vendor-page";
import { DrivingLicenceTypePage } from "./driving-licence-type-page";
import { DocumentTypePage } from "./document-type-page";

const GROUPS = [
  {
    value: "vehicle",
    label: "Vehicle",
    items: [
      { value: "vehicle-type", label: "Vehicle Type", element: <VehicleTypePage /> },
      { value: "vehicle-make", label: "Make", element: <VehicleMakePage /> },
      { value: "vehicle-model", label: "Model", element: <VehicleModelPage /> },
      { value: "fuel-type", label: "Fuel Type", element: <FuelTypePage /> },
      { value: "gear-oil-type", label: "Gear Oil Type", element: <GearOilTypePage /> },
      { value: "tyre-type", label: "Tyre Type", element: <TyreTypePage /> },
      { value: "engine-oil", label: "Engine Oil", element: <EngineOilPage /> },
    ],
  },
  {
    value: "operations",
    label: "Operations",
    items: [
      { value: "department", label: "Department", element: <DepartmentPage /> },
      { value: "vehicle-purpose", label: "Vehicle Purpose", element: <VehiclePurposePage /> },
      { value: "cost-center", label: "Cost Center", element: <CostCenterPage /> },
      { value: "location-site", label: "Location / Site", element: <LocationSitePage /> },
      { value: "gate", label: "Gate", element: <GatePage /> },
    ],
  },
  {
    value: "maintenance",
    label: "Maintenance",
    items: [
      { value: "service-type", label: "Service Type", element: <MaintenanceServiceTypePage /> },
      { value: "parts-consumables", label: "Parts / Consumables", element: <PartsConsumablePage /> },
      { value: "workshop-vendor", label: "Workshop / Vendor", element: <WorkshopVendorPage /> },
    ],
  },
  {
    value: "documents",
    label: "Documents & Licensing",
    items: [
      { value: "licence-type", label: "Driving Licence Type", element: <DrivingLicenceTypePage /> },
      { value: "document-type", label: "Document Type", element: <DocumentTypePage /> },
    ],
  },
];

export function MasterSetupPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Master Setup" description="Company-wide reference data used across vehicles, drivers, maintenance and gate operations." />
      <Tabs defaultValue={GROUPS[0].value}>
        <TabsList>
          {GROUPS.map((group) => (
            <TabsTrigger key={group.value} value={group.value}>
              {group.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {GROUPS.map((group) => (
          <TabsContent key={group.value} value={group.value}>
            <Tabs defaultValue={group.items[0].value}>
              <TabsList>
                {group.items.map((item) => (
                  <TabsTrigger key={item.value} value={item.value}>
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {group.items.map((item) => (
                <TabsContent key={item.value} value={item.value}>
                  {item.element}
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
