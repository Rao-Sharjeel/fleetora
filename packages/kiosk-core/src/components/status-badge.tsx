import { CheckCircle2, XCircle } from "lucide-react";

export function SuccessBadge({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <CheckCircle2 className="h-14 w-14 text-kiosk-success" />
      <p className="text-lg font-semibold text-kiosk-success">{label}</p>
    </div>
  );
}

export function BlockedBadge({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <XCircle className="h-14 w-14 text-kiosk-danger" />
      <p className="text-lg font-semibold text-kiosk-danger">{label}</p>
    </div>
  );
}
