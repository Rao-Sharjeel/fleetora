import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { configureKiosk, DeviceGate, MobileOnlyGate } from "@fleetora/kiosk-core";
import "./index.css";
import App from "./App.tsx";

configureKiosk({ wordmark: "ENTRY" });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MobileOnlyGate>
      <DeviceGate>
        <App />
      </DeviceGate>
    </MobileOnlyGate>
  </StrictMode>,
);
