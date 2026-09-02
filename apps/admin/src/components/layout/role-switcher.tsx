import { Check, UserCog } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ROLES, useSession } from "@/hooks/use-session";
import { defaultRouteForRole } from "@/routes/nav-config";

/**
 * Stands in for real authentication until the Django backend exists. Lets any
 * reviewer preview every role's navigation and layout from one running build.
 */
export function RoleSwitcher() {
  const { role, setRole } = useSession();
  const navigate = useNavigate();
  const current = ROLES.find((r) => r.id === role);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserCog className="h-4 w-4" />
          {current?.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Preview as role (mock auth)</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ROLES.map((r) => (
          <DropdownMenuItem
            key={r.id}
            onClick={() => {
              setRole(r.id);
              navigate(defaultRouteForRole(r.id));
            }}
            className="flex flex-col items-start gap-0.5"
          >
            <span className="flex w-full items-center justify-between font-medium">
              {r.label}
              {r.id === role && <Check className="h-4 w-4 text-success" />}
            </span>
            <span className="text-xs text-muted-foreground">{r.description}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
