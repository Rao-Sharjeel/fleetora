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
import type { Role } from "@/types";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  roles: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, roles: ["admin", "fleet_manager", "management"] },
  { label: "Vehicles", path: "/vehicles", icon: Truck, roles: ["admin", "fleet_manager", "management"] },
  { label: "Drivers", path: "/drivers", icon: Users, roles: ["admin", "fleet_manager", "management"] },
  { label: "Security Guards", path: "/guards", icon: ShieldAlert, roles: ["admin"] },
  { label: "Requisitions", path: "/requisitions", icon: ClipboardList, roles: ["admin", "fleet_manager"] },
  { label: "Vehicles Outside", path: "/vehicles-outside", icon: MapPinned, roles: ["admin", "fleet_manager", "management"] },
  { label: "Trip Register", path: "/trips", icon: Route, roles: ["admin", "fleet_manager", "management"] },
  { label: "Fuel", path: "/fuel", icon: Fuel, roles: ["admin", "fleet_manager"] },
  { label: "Maintenance", path: "/maintenance", icon: Wrench, roles: ["admin", "fleet_manager"] },
  { label: "Tyres", path: "/tyres", icon: CircleDot, roles: ["admin", "fleet_manager"] },
  { label: "Documents", path: "/documents", icon: FileWarning, roles: ["admin", "fleet_manager"] },
  { label: "Alerts", path: "/alerts", icon: Bell, roles: ["admin", "fleet_manager", "management"] },
  { label: "Reports", path: "/reports", icon: BarChart3, roles: ["admin", "fleet_manager", "management"] },
  { label: "Master Setup", path: "/master-data", icon: Database, roles: ["admin"] },
  { label: "Users & Permissions", path: "/users", icon: ShieldCheck, roles: ["admin"] },
  { label: "Kiosk Devices", path: "/kiosk-devices", icon: Tablet, roles: ["admin"] },
  { label: "Audit Trail", path: "/audit", icon: History, roles: ["admin"] },
  { label: "Administration", path: "/settings", icon: Settings, roles: ["admin"] },
];

export const GATE_TILES: { label: string; path: string; icon: LucideIcon }[] = [
  { label: "Vehicle Out", path: "/gate/out", icon: LogOut },
  { label: "Vehicle In", path: "/gate/in", icon: LogIn },
  { label: "Currently Out", path: "/gate/outside", icon: MapPinned },
  { label: "Fuel Entry", path: "/gate/fuel", icon: Fuel },
];

export function navItemsForRole(role: Role) {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function defaultRouteForRole(role: Role): string {
  if (role === "gate_guard") return "/gate/out";
  if (role === "driver") return "/my-trips";
  return "/dashboard";
}
