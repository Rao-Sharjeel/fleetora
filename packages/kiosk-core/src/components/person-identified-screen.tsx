import { KioskShell, PrimaryButton } from "./kiosk-shell";
import { SuccessBadge } from "./status-badge";
import { PersonCard } from "./person-card";
import { formatTimestamp } from "../lib/format";

interface PersonIdentifiedScreenProps {
  label: string;
  name: string;
  photoUrl?: string;
  fields: { label: string; value: string }[];
  capturedAt: string;
  onContinue: () => void;
  onBack?: () => void;
}

/** The "✓ Guard/Driver Identified" confirmation step — shared by all three kiosks. */
export function PersonIdentifiedScreen({
  label,
  name,
  photoUrl,
  fields,
  capturedAt,
  onContinue,
  onBack,
}: PersonIdentifiedScreenProps) {
  return (
    <KioskShell onBack={onBack} footer={<PrimaryButton onClick={onContinue}>Continue</PrimaryButton>}>
      <SuccessBadge label={label} />
      <PersonCard photoUrl={photoUrl} name={name} fields={fields} capturedAt={formatTimestamp(capturedAt)} />
    </KioskShell>
  );
}
