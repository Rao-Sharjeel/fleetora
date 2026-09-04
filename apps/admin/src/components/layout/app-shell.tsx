import { LogOut } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { navItemsForRole } from "@/routes/nav-config";
import { useSession } from "@/hooks/use-session";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { UnsupportedDeviceScreen } from "@/components/layout/unsupported-device-screen";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function AppShell() {
  const { role, userName, logout } = useSession();
  const navItems = navItemsForRole(role);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  if (isMobile) {
    return <UnsupportedDeviceScreen />;
  }

  return (
    <div className="flex h-svh w-full overflow-hidden bg-background">
      <aside className="flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="flex h-16 items-center px-5">
          {/* <img src="/fleetora-wordmark.png" alt="Fleetora" className="h-11 w-auto max-w-full object-contain" /> */}
          <img src="/drive-logo.png" alt="D-RIVE" className="h-11 w-auto max-w-full object-contain" />
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/[0.06] text-sidebar-foreground"
                    : "text-sidebar-muted-foreground hover:bg-white/[0.04] hover:text-sidebar-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "absolute inset-y-1 left-0 w-[3px] rounded-full bg-sidebar-accent transition-opacity",
                      isActive ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden
                  />
                  <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-sidebar-accent")} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-sidebar-border px-5 py-4 font-tabular text-[0.6875rem] tracking-wide text-sidebar-muted-foreground">
          Developed by{" "}
          <a
            href="https://sigmasoftai.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-dotted underline-offset-2 hover:text-sidebar-foreground"
          >
            SigmaSoft AI
          </a>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-end border-b border-border bg-card/70 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            <Avatar>
              <AvatarFallback>{userName.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
