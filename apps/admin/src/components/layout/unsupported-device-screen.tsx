import { Monitor } from "lucide-react";

export function UnsupportedDeviceScreen() {
  return (
    <div className="flex h-svh w-full flex-col items-center justify-center gap-6 bg-sidebar px-6 text-center text-sidebar-foreground">
      {/* <img src="/fleetora-wordmark.png" alt="Fleetora" className="h-10 w-auto max-w-[16rem] object-contain" /> */}
      <img src="/drive-logo.png" alt="D-RIVE" className="h-10 w-auto max-w-[16rem] object-contain" />
      <div className="flex flex-col items-center gap-3">
        <Monitor className="h-8 w-8 text-sidebar-muted-foreground" />
        <p className="max-w-xs text-sm text-sidebar-muted-foreground">
          Fleetora is designed for desktop use and isn't available on mobile devices. Please switch to a desktop or
          laptop to continue.
        </p>
      </div>
    </div>
  );
}
