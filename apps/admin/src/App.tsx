import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { GateShell } from "@/components/layout/gate-shell";
import { AuthGuard, PermissionGuard } from "@/components/layout/permission-guard";
import { DashboardPage } from "@/features/dashboard/pages/dashboard-page";
import { VehiclesListPage } from "@/features/vehicles/pages/vehicles-list-page";
import { VehicleProfilePage } from "@/features/vehicles/pages/vehicle-profile-page";
import { DriversListPage } from "@/features/drivers/pages/drivers-list-page";
import { DriverProfilePage } from "@/features/drivers/pages/driver-profile-page";
import { GuardsListPage } from "@/features/guards/pages/guards-list-page";
import { GuardProfilePage } from "@/features/guards/pages/guard-profile-page";
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
import { NoAccessPage } from "@/features/auth/no-access-page";
import { LoginPage } from "@/features/auth/login-page";
import { useSession } from "@/hooks/use-session";
import { ADMIN_ONLY, GATE_PERMISSIONS, defaultRouteFor } from "@/routes/nav-config";
import { OdometerIssuesPage } from "@/features/odometer-issues/pages/odometer-issues-page";

function HomeRedirect() {
  const { isAuthenticated, userType, permissions } = useSession();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={defaultRouteFor({ userType, permissions })} replace />;
}

/** Picks up role/permission changes an admin made since this user signed in. */
function useProfileRefresh() {
  const isAuthenticated = useSession((s) => s.isAuthenticated);
  const refreshProfile = useSession((s) => s.refreshProfile);
  useEffect(() => {
    if (!isAuthenticated) return;
    const refresh = () => void refreshProfile().catch(() => {});
    refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [isAuthenticated, refreshProfile]);
}

export default function App() {
  useProfileRefresh();
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      <Route
        element={
          <AuthGuard>
            <AppShell />
          </AuthGuard>
        }
      >
        <Route
          path="/dashboard"
          element={
            <PermissionGuard anyOf={["dashboard.view"]}>
              <DashboardPage />
            </PermissionGuard>
          }
        />
        <Route
          path="/vehicles"
          element={
            <PermissionGuard anyOf={["vehicles.view"]}>
              <VehiclesListPage />
            </PermissionGuard>
          }
        />
        <Route
          path="/vehicles/:vehicleId"
          element={
            <PermissionGuard anyOf={["vehicles.view"]}>
              <VehicleProfilePage />
            </PermissionGuard>
          }
        />
        <Route
          path="/drivers"
          element={
            <PermissionGuard anyOf={["drivers.view"]}>
              <DriversListPage />
            </PermissionGuard>
          }
        />
        <Route
          path="/drivers/:driverId"
          element={
            <PermissionGuard anyOf={["drivers.view"]}>
              <DriverProfilePage />
            </PermissionGuard>
          }
        />
        <Route
          path="/guards"
          element={
            <PermissionGuard anyOf={["guards.view"]}>
              <GuardsListPage />
            </PermissionGuard>
          }
        />
        <Route
          path="/guards/:guardId"
          element={
            <PermissionGuard anyOf={["guards.view"]}>
              <GuardProfilePage />
            </PermissionGuard>
          }
        />
        <Route
          path="/requisitions"
          element={
            <PermissionGuard anyOf={["requisitions.view"]}>
              <RequisitionsPage />
            </PermissionGuard>
          }
        />
        <Route
          path="/vehicles-outside"
          element={
            <PermissionGuard anyOf={["trips.view"]}>
              <VehiclesOutsidePage />
            </PermissionGuard>
          }
        />
        <Route
          path="/trips"
          element={
            <PermissionGuard anyOf={["trips.view"]}>
              <TripRegisterPage />
            </PermissionGuard>
          }
        />
        <Route
          path="/fuel"
          element={
            <PermissionGuard anyOf={["fuel.view"]}>
              <FuelPage />
            </PermissionGuard>
          }
        />
        <Route
          path="/maintenance"
          element={
            <PermissionGuard anyOf={["maintenance.view"]}>
              <MaintenancePage />
            </PermissionGuard>
          }
        />
        <Route
          path="/tyres"
          element={
            <PermissionGuard anyOf={["tyres.view"]}>
              <TyresPage />
            </PermissionGuard>
          }
        />
        <Route
          path="/documents"
          element={
            <PermissionGuard anyOf={["documents.view"]}>
              <DocumentsPage />
            </PermissionGuard>
          }
        />
        <Route
          path="/alerts"
          element={
            <PermissionGuard anyOf={["alerts.view"]}>
              <AlertsPage />
            </PermissionGuard>
          }
        />
        <Route
          path="/reports"
          element={
            <PermissionGuard anyOf={["reports.view"]}>
              <ReportsPage />
            </PermissionGuard>
          }
        />
        <Route
          path="/master-data"
          element={
            <PermissionGuard anyOf={["master_data.view"]}>
              <MasterSetupPage />
            </PermissionGuard>
          }
        />
        <Route
          path="/odometer-issues"
          element={
            <PermissionGuard anyOf={["odometer_issues.view"]}>
              <OdometerIssuesPage />
            </PermissionGuard>
          }
        />
        <Route
          path="/users"
          element={
            <PermissionGuard anyOf={[ADMIN_ONLY]}>
              <UsersPage />
            </PermissionGuard>
          }
        />
        <Route
          path="/kiosk-devices"
          element={
            <PermissionGuard anyOf={[ADMIN_ONLY]}>
              <KioskDevicesPage />
            </PermissionGuard>
          }
        />
        <Route
          path="/audit"
          element={
            <PermissionGuard anyOf={["audit.view"]}>
              <AuditPage />
            </PermissionGuard>
          }
        />
        <Route
          path="/settings"
          element={
            <PermissionGuard anyOf={["settings.view"]}>
              <SettingsPage />
            </PermissionGuard>
          }
        />
      </Route>

      <Route
        element={
          <PermissionGuard anyOf={GATE_PERMISSIONS}>
            <GateShell />
          </PermissionGuard>
        }
      >
        <Route
          path="/gate/out"
          element={
            <PermissionGuard anyOf={["gate.exit"]}>
              <GateOutPage />
            </PermissionGuard>
          }
        />
        <Route
          path="/gate/in"
          element={
            <PermissionGuard anyOf={["gate.entry"]}>
              <GateInPage />
            </PermissionGuard>
          }
        />
        <Route
          path="/gate/outside"
          element={
            <PermissionGuard anyOf={["gate.exit", "gate.entry"]}>
              <VehiclesOutsidePage />
            </PermissionGuard>
          }
        />
        <Route
          path="/gate/fuel"
          element={
            <PermissionGuard anyOf={["gate.fuel"]}>
              <GateFuelEntryPage />
            </PermissionGuard>
          }
        />
      </Route>

      <Route
        path="/no-access"
        element={
          <AuthGuard>
            <NoAccessPage />
          </AuthGuard>
        }
      />
      <Route path="/login" element={<LoginPage />} />

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
