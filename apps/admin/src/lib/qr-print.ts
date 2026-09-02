import QRCode from "qrcode";

/**
 * Opens a print-ready label for one vehicle's QR code, sized like Fleetora's
 * 4x4 inch sticker sheets. A plain browser print (no PDF library) is enough
 * since this is a one-off "print this vehicle's tag" action, not batch output.
 */
export async function printVehicleQrLabel(registrationNumber: string, qrCode: string): Promise<void> {
  const dataUrl = await QRCode.toDataURL(qrCode, { width: 600, margin: 1 });

  const win = window.open("", "_blank", "width=500,height=600");
  if (!win) return;

  win.document.write(`<!doctype html>
<html>
  <head>
    <title>QR Label — ${registrationNumber}</title>
    <style>
      @page { size: 4in 4in; margin: 0.15in; }
      body {
        font-family: system-ui, sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.15in;
        margin: 0;
        height: 100vh;
      }
      .plate {
        font-size: 28px;
        font-weight: 700;
        letter-spacing: 0.02em;
      }
      img { width: 3in; height: 3in; }
    </style>
  </head>
  <body>
    <div class="plate">${registrationNumber}</div>
    <img src="${dataUrl}" alt="QR code for ${registrationNumber}" />
  </body>
</html>`);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
}

export interface StaffIdCardParams {
  /** The Fleetora ID encoded in the QR — a Guard's guardId or a Driver's employeeId. */
  id: string;
  name: string;
  role: string;
  photoUrl?: string;
}

/**
 * Opens a print-ready Fleetora staff ID card (CR80 badge size) whose QR encodes the
 * person's Fleetora ID — the same ID the Exit/Entry/Fuel kiosks resolve via getGuardByCode
 * / getDriverByCode, so this card is what a guard or driver scans at the gate.
 */
export async function printStaffIdCard({ id, name, role, photoUrl }: StaffIdCardParams): Promise<void> {
  const dataUrl = await QRCode.toDataURL(id, { width: 300, margin: 1 });

  const win = window.open("", "_blank", "width=500,height=350");
  if (!win) return;

  win.document.write(`<!doctype html>
<html>
  <head>
    <title>Fleetora ID — ${name}</title>
    <style>
      @page { size: 3.375in 2.125in; margin: 0; }
      body {
        font-family: system-ui, sans-serif;
        margin: 0;
        width: 3.375in;
        height: 2.125in;
        display: flex;
        box-sizing: border-box;
        padding: 0.16in;
        gap: 0.16in;
        background: #0B1220;
        color: #fff;
      }
      .info { display: flex; flex-direction: column; justify-content: space-between; flex: 1; min-width: 0; }
      .brand { font-size: 9px; font-weight: 700; letter-spacing: 0.04em; color: #f5821f; }
      .photo {
        width: 0.75in; height: 0.75in; border-radius: 999px; object-fit: cover;
        background: #26314f; flex-shrink: 0;
      }
      .name { font-size: 15px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .role { font-size: 10px; color: #b7c0d6; }
      .id { font-size: 10px; font-variant-numeric: tabular-nums; color: #f5821f; font-weight: 600; }
      .qr { width: 0.9in; height: 0.9in; align-self: center; }
    </style>
  </head>
  <body>
    ${photoUrl ? `<img class="photo" src="${photoUrl}" alt="${name}" />` : `<div class="photo"></div>`}
    <div class="info">
      <span class="brand">FLEETORA</span>
      <span class="name">${name}</span>
      <span class="role">${role}</span>
      <span class="id">${id}</span>
    </div>
    <img class="qr" src="${dataUrl}" alt="QR code for ${id}" />
  </body>
</html>`);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
}
