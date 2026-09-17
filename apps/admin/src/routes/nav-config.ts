import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Truck,
  Users,
  ClipboardList,
  LogOut,
  LogIn,
  MapPinned,
  Route,
  Fuel,
  Gauge,
  Wrench,
  CircleDot,
  FileWarning,
  Bell,
  BarChart3,
  ShieldCheck,
  History,
  Settings,
  Database,
  ShieldAlert,
  Tablet,
} from "lucide-react";
import type { PermissionCode, UserType } from "@/types";

/** Screens no permission unlocks — only admins manage users, roles and kiosk keys. */
export const ADMIN_ONLY = "admin-only";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** What unlocks the screen: a permission codename, or ADMIN_ONLY. */
  permission: PermissionCode;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
  { label: "Vehicles", path: "/vehicles", icon: Truck, permission: "vehicles.view" },
  { label: "Drivers", path: "/drivers", icon: Users, permission: "drivers.view" },
  { label: "Security Guards", path: "/guards", icon: ShieldAlert, permission: "guards.view" },
  { label: "Requisitions", path: "/requisitions", icon: ClipboardList, permission: "requisitions.view" },
  { label: "Vehicles Outside", path: "/vehicles-outside", icon: MapPinned, permission: "trips.view" },
  { label: "Trip Register", path: "/trips", icon: Route, permission: "trips.view" },
  { label: "Fix Odo Readings", path: "/odometer-issues", icon: Gauge, permission: "odometer_issues.view" },
  { label: "Fuel", path: "/fuel", icon: Fuel, permission: "fuel.view" },
  { label: "Maintenance", path: "/maintenance", icon: Wrench, permission: "maintenance.view" },
  { label: "Tyres", path: "/tyres", icon: CircleDot, permission: "tyres.view" },
  { label: "Documents", path: "/documents", icon: FileWarning, permission: "documents.view" },
  { label: "Alerts", path: "/alerts", icon: Bell, permission: "alerts.view" },
  { label: "Reports", path: "/reports", icon: BarChart3, permission: "reports.view" },
  { label: "Master Setup", path: "/master-data", icon: Database, permission: "master_data.view" },
  { label: "Users & Permissions", path: "/users", icon: ShieldCheck, permission: ADMIN_ONLY },
  { label: "Kiosk Devices", path: "/kiosk-devices", icon: Tablet, permission: ADMIN_ONLY },
  { label: "Audit Trail", path: "/audit", icon: History, permission: "audit.view" },
  { label: "Administration", path: "/settings", icon: Settings, permission: "settings.view" },
];

export const GATE_PERMISSIONS: PermissionCode[] = ["gate.exit", "gate.entry", "gate.fuel"];

export const GATE_TILES: { label: string; path: string; icon: LucideIcon; anyOf: PermissionCode[] }[] = [
  { label: "Vehicle Out", path: "/gate/out", icon: LogOut, anyOf: ["gate.exit"] },
  { label: "Vehicle In", path: "/gate/in", icon: LogIn, anyOf: ["gate.entry"] },
  { label: "Currently Out", path: "/gate/outside", icon: MapPinned, anyOf: ["gate.exit", "gate.entry"] },
  { label: "Fuel Entry", path: "/gate/fuel", icon: Fuel, anyOf: ["gate.fuel"] },
];

interface Access {
  userType: UserType;
  permissions: PermissionCode[];
}

function holds({ userType, permissions }: Access, permission: PermissionCode) {
  if (userType === "admin") return true;
  return permission !== ADMIN_ONLY && permissions.includes(permission);
}

export function navItemsFor(access: Access) {
  return NAV_ITEMS.filter((item) => holds(access, item.permission));
}

export function gateTilesFor(access: Access) {
  return GATE_TILES.filter((tile) => tile.anyOf.some((p) => holds(access, p)));
}

/** Where to land after sign-in: the first screen the user can open. */
export function defaultRouteFor(access: Access): string {
  return navItemsFor(access)[0]?.path ?? gateTilesFor(access)[0]?.path ?? "/no-access";
}
