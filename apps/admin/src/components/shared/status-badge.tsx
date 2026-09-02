import { Badge, type BadgeProps } from "@/components/ui/badge";
import type {
  VehicleStatus,
  TripDurationStatus,
  MaintenanceAlertStatus,
  DocumentAlertStatus,
} from "@/types";

type KnownStatus =
  | VehicleStatus
  | TripDurationStatus
  | MaintenanceAlertStatus
  | DocumentAlertStatus
  | "open"
  | "completed"
  | "ok"
  | "maintenance_required"
  | "damage_incident"
  | "valid";

const STATUS_CONFIG: Record<KnownStatus, { label: string; variant: BadgeProps["variant"] }> = {
  available: { label: "Available", variant: "success" },
  outside: { label: "Outside", variant: "secondary" },
  workshop: { label: "Workshop", variant: "warning" },
  inactive: { label: "Inactive", variant: "muted" },

  normal: { label: "Normal", variant: "success" },
  expected_soon: { label: "Expected Soon", variant: "warning" },
  overdue: { label: "Overdue", variant: "destructive" },

  due_soon: { label: "Due Soon", variant: "warning" },
  urgent: { label: "Urgent", variant: "destructive" },

  ok: { label: "OK", variant: "success" },
  valid: { label: "Valid", variant: "success" },
  expiring_soon: { label: "Expiring Soon", variant: "warning" },
  expired: { label: "Expired", variant: "destructive" },

  open: { label: "Open", variant: "secondary" },
  completed: { label: "Completed", variant: "success" },

  maintenance_required: { label: "Maintenance Required", variant: "warning" },
  damage_incident: { label: "Damage / Incident", variant: "destructive" },
};

export function StatusBadge({ status, className }: { status: KnownStatus; className?: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: "muted" as const };
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
