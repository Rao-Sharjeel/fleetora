import { LayoutDashboard, LogOut } from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { gateTilesFor, navItemsFor } from "@/routes/nav-config";

/**
 * Touch-first, large-control interface for the gate/security guard device
 * (spec section 23). Deliberately shallow: four primary actions, minimal
 * typing, no sidebar of secondary admin screens.
 */
export function GateShell() {
  const { userType, permissions, userName, logout } = useSession();
  const tiles = gateTilesFor({ userType, permissions });
  const officeHome = navItemsFor({ userType, permissions })[0]?.path;
  const navigate = useNavigate();

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-sidebar px-4 text-sidebar-foreground">
        <div className="flex items-center gap-2.5">
          {/* <img src="/fleetora-logo.png" alt="Fleetora" className="h-8 w-auto object-contain" /> */}
          <img src="/drive-logo.png" alt="D-RIVE" className="h-8 w-auto object-contain" />
          <span className="text-xs font-medium uppercase tracking-wide text-sidebar-muted-foreground">
            Gate Control
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {officeHome && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to={officeHome}>
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Office</span>
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out {userName && `(${userName})`}</span>
          </Button>
        </div>
      </header>

      <nav className="grid grid-cols-2 gap-3 border-b border-border bg-card p-3 sm:grid-cols-4">
        {tiles.map((tile) => (
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
