import { Navigate } from "react-router-dom";
import type { Role } from "@/types";
import { useSession } from "@/hooks/use-session";
import { defaultRouteForRole } from "@/routes/nav-config";

export function RoleGuard({ allow, children }: { allow: Role[]; children: React.ReactNode }) {
  const { role, isAuthenticated } = useSession();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!allow.includes(role)) {
    return <Navigate to={defaultRouteForRole(role)} replace />;
  }
  return <>{children}</>;
}
