import { useState } from "react";
import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface QrScanInputProps {
  placeholder?: string;
  onScan: (code: string) => void;
  className?: string;
}

/**
 * Placeholder for device-camera QR/barcode scanning (spec section 30). Until
 * a scanning library is wired to the real camera stream, guards can type the
 * vehicle/driver code directly — same downstream handler either way.
 */
export function QrScanInput({ placeholder = "Scan or enter code", onScan, className }: QrScanInputProps) {
  const [value, setValue] = useState("");

  function submit() {
    if (!value.trim()) return;
    onScan(value.trim());
    setValue("");
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="h-12 text-base"
      />
      <Button type="button" size="touch" onClick={submit}>
        <ScanLine className="h-5 w-5" /> Scan
      </Button>
    </div>
  );
}
