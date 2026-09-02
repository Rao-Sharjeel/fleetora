import { useSuperAdminSession } from "@/hooks/use-superadmin-session";
import { LoginPage } from "@/pages/login-page";
import { TenantsPage } from "@/pages/tenants-page";

export default function App() {
  const isAuthenticated = useSuperAdminSession((s) => s.isAuthenticated);
  return isAuthenticated ? <TenantsPage /> : <LoginPage />;
}
