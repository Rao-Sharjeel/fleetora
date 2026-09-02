import { UserRound } from "lucide-react";

interface PersonCardProps {
  photoUrl?: string;
  name: string;
  fields: { label: string; value: string }[];
  capturedAt: string;
}

export function PersonCard({ photoUrl, name, fields, capturedAt }: PersonCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-kiosk-border bg-kiosk-panel p-4">
      <div className="flex items-center gap-3">
        {photoUrl ? (
          <img src={photoUrl} alt={name} className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-kiosk-panel-alt">
            <UserRound className="h-7 w-7 text-kiosk-muted" />
          </div>
        )}
        <div>
          <p className="text-base font-semibold">{name}</p>
          {fields.map((f) => (
            <p key={f.label} className="text-xs text-kiosk-muted">
              {f.label}: {f.value}
            </p>
          ))}
        </div>
      </div>
      <p className="text-xs text-kiosk-muted">Captured At: {capturedAt}</p>
    </div>
  );
}
