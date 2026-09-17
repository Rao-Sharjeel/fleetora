import { Navigate } from "react-router-dom";
import type { PermissionCode } from "@/types";
import { useSession } from "@/hooks/use-session";
import { ADMIN_ONLY, defaultRouteFor } from "@/routes/nav-config";

/**
 * Renders children only if the user holds any of `anyOf` (admins always do);
 * otherwise sends them to the first screen they can open.
 */
export function PermissionGuard({ anyOf, children }: { anyOf: PermissionCode[]; children: React.ReactNode }) {
  const { userType, permissions, isAuthenticated } = useSession();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  const allowed =
    userType === "admin" || anyOf.some((p) => p !== ADMIN_ONLY && permissions.includes(p));
  if (!allowed) {
    return <Navigate to={defaultRouteFor({ userType, permissions })} replace />;
  }
  return <>{children}</>;
}

/** Requires a signed-in user and nothing else — for the shells and the no-access page. */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useSession((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}
