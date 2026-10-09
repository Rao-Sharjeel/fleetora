import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { configureKiosk, DeviceGate, MobileOnlyGate } from "@fleetora/kiosk-core";
import "./index.css";
import App from "./App.tsx";

// No `app` here, unlike the single-function builds: this one pairs for every
// function its key allows and the launcher offers those. The wordmark is
// replaced by the launcher the moment a flow is chosen.
configureKiosk({ wordmark: "GATE" });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MobileOnlyGate>
      <DeviceGate>
        <App />
      </DeviceGate>
    </MobileOnlyGate>
  </StrictMode>,
);
