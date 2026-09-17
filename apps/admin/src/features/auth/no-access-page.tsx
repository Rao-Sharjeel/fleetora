import { ShieldOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";

/** A staff account with no role and no permissions lands here instead of looping. */
export function NoAccessPage() {
  const { userName, logout } = useSession();
  const navigate = useNavigate();
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <ShieldOff className="h-10 w-10 text-muted-foreground" />
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">No access yet</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {userName ? `${userName}, your` : "Your"} account doesn't have any permissions. Ask an administrator to
          assign you a role.
        </p>
      </div>
      <Button
        variant="outline"
        onClick={() => {
          logout();
          navigate("/login");
        }}
      >
        Sign out
      </Button>
    </div>
  );
}
