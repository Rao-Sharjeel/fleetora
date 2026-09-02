import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { GateShell } from "@/components/layout/gate-shell";
import { RoleGuard } from "@/components/layout/role-guard";
import { DashboardPage } from "@/features/dashboard/pages/dashboard-page";
import { VehiclesListPage } from "@/features/vehicles/pages/vehicles-list-page";
import { VehicleProfilePage } from "@/features/vehicles/pages/vehicle-profile-page";
import { DriversListPage } from "@/features/drivers/pages/drivers-list-page";
import { GuardsListPage } from "@/features/guards/pages/guards-list-page";
import { RequisitionsPage } from "@/features/requisitions/pages/requisitions-page";
import { VehiclesOutsidePage } from "@/features/vehicles-outside/pages/vehicles-outside-page";
import { TripRegisterPage } from "@/features/trips/pages/trip-register-page";
import { FuelPage } from "@/features/fuel/pages/fuel-page";
import { GateFuelEntryPage } from "@/features/fuel/pages/gate-fuel-entry-page";
import { MaintenancePage } from "@/features/maintenance/pages/maintenance-page";
import { TyresPage } from "@/features/tyres/pages/tyres-page";
import { DocumentsPage } from "@/features/documents/pages/documents-page";
import { AlertsPage } from "@/features/alerts/pages/alerts-page";
import { ReportsPage } from "@/features/reports/pages/reports-page";
import { UsersPage } from "@/features/users/pages/users-page";
import { KioskDevicesPage } from "@/features/kiosk-devices/pages/kiosk-devices-page";
import { AuditPage } from "@/features/audit/pages/audit-page";
import { SettingsPage } from "@/features/settings/pages/settings-page";
import { MasterSetupPage } from "@/features/master-data/pages/master-setup-page";
import { GateOutPage } from "@/features/gate-out/pages/gate-out-page";
import { GateInPage } from "@/features/gate-in/pages/gate-in-page";
import { DriverPortalPage } from "@/features/auth/driver-portal-page";
import { LoginPage } from "@/features/auth/login-page";
import { useSession } from "@/hooks/use-session";
import { defaultRouteForRole } from "@/routes/nav-config";

function HomeRedirect() {
  const role = useSession((s) => s.role);
  return <Navigate to={defaultRouteForRole(role)} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      <Route
        element={
          <RoleGuard allow={["admin", "fleet_manager", "management", "driver"]}>
            <AppShell />
          </RoleGuard>
        }
      >
        <Route
          path="/dashboard"
          element={
            <RoleGuard allow={["admin", "fleet_manager", "management"]}>
              <DashboardPage />
            </RoleGuard>
          }
        />
        <Route
          path="/vehicles"
          element={
            <RoleGuard allow={["admin", "fleet_manager", "management"]}>
              <VehiclesListPage />
            </RoleGuard>
          }
        />
        <Route
          path="/vehicles/:vehicleId"
          element={
            <RoleGuard allow={["admin", "fleet_manager", "management"]}>
              <VehicleProfilePage />
            </RoleGuard>
          }
        />
        <Route
          path="/drivers"
          element={
            <RoleGuard allow={["admin", "fleet_manager", "management"]}>
              <DriversListPage />
            </RoleGuard>
          }
        />
        <Route
          path="/guards"
          element={
            <RoleGuard allow={["admin"]}>
              <GuardsListPage />
            </RoleGuard>
          }
        />
        <Route
          path="/requisitions"
          element={
            <RoleGuard allow={["admin", "fleet_manager"]}>
              <RequisitionsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/vehicles-outside"
          element={
            <RoleGuard allow={["admin", "fleet_manager", "management"]}>
              <VehiclesOutsidePage />
            </RoleGuard>
          }
        />
        <Route
          path="/trips"
          element={
            <RoleGuard allow={["admin", "fleet_manager", "management"]}>
              <TripRegisterPage />
            </RoleGuard>
          }
        />
        <Route
          path="/fuel"
          element={
            <RoleGuard allow={["admin", "fleet_manager"]}>
              <FuelPage />
            </RoleGuard>
          }
        />
        <Route
          path="/maintenance"
          element={
            <RoleGuard allow={["admin", "fleet_manager"]}>
              <MaintenancePage />
            </RoleGuard>
          }
        />
        <Route
          path="/tyres"
          element={
            <RoleGuard allow={["admin", "fleet_manager"]}>
              <TyresPage />
            </RoleGuard>
          }
        />
        <Route
          path="/documents"
          element={
            <RoleGuard allow={["admin", "fleet_manager"]}>
              <DocumentsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/alerts"
          element={
            <RoleGuard allow={["admin", "fleet_manager", "management"]}>
              <AlertsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/reports"
          element={
            <RoleGuard allow={["admin", "fleet_manager", "management"]}>
              <ReportsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/master-data"
          element={
            <RoleGuard allow={["admin"]}>
              <MasterSetupPage />
            </RoleGuard>
          }
        />
        <Route
          path="/users"
          element={
            <RoleGuard allow={["admin"]}>
              <UsersPage />
            </RoleGuard>
          }
        />
        <Route
          path="/kiosk-devices"
          element={
            <RoleGuard allow={["admin"]}>
              <KioskDevicesPage />
            </RoleGuard>
          }
        />
        <Route
          path="/audit"
          element={
            <RoleGuard allow={["admin"]}>
              <AuditPage />
            </RoleGuard>
          }
        />
        <Route
          path="/settings"
          element={
            <RoleGuard allow={["admin"]}>
              <SettingsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/my-trips"
          element={
            <RoleGuard allow={["driver"]}>
              <DriverPortalPage />
            </RoleGuard>
          }
        />
      </Route>

      <Route
        element={
          <RoleGuard allow={["gate_guard"]}>
            <GateShell />
          </RoleGuard>
        }
      >
        <Route path="/gate/out" element={<GateOutPage />} />
        <Route path="/gate/in" element={<GateInPage />} />
        <Route path="/gate/outside" element={<VehiclesOutsidePage />} />
        <Route path="/gate/fuel" element={<GateFuelEntryPage />} />
      </Route>

      <Route path="/login" element={<LoginPage />} />

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
