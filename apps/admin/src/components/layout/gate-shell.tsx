import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { RoleSwitcher } from "@/components/layout/role-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { GATE_TILES } from "@/routes/nav-config";

/**
 * Touch-first, large-control interface for the gate/security guard device
 * (spec section 23). Deliberately shallow: four primary actions, minimal
 * typing, no sidebar of secondary admin screens.
 */
export function GateShell() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-sidebar px-4 text-sidebar-foreground">
        <div className="flex items-center gap-2.5">
          <img src="/fleetora-logo.png" alt="Fleetora" className="h-8 w-auto object-contain" />
          <span className="text-xs font-medium uppercase tracking-wide text-sidebar-muted-foreground">
            Gate Control
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <RoleSwitcher />
        </div>
      </header>

      <nav className="grid grid-cols-2 gap-3 border-b border-border bg-card p-3 sm:grid-cols-4">
        {GATE_TILES.map((tile) => (
          <NavLink
            key={tile.path}
            to={tile.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-2 rounded-xl border py-4 text-sm font-semibold transition-colors",
                isActive
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border text-foreground hover:bg-muted",
              )
            }
          >
            <tile.icon className="h-6 w-6" />
            {tile.label}
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 overflow-y-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
