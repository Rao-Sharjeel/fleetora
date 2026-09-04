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
  /** The D-RIVE ID encoded in the QR — a Guard's guardId or a Driver's employeeId. */
  id: string;
  name: string;
  /** Job title, e.g. "Security Guard" or "Driver". */
  role: string;
  department?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Opens a print-ready D-RIVE staff ID card (portrait CR80 badge size) whose QR encodes the
 * person's D-RIVE ID — the same ID the Exit/Entry/Fuel kiosks resolve via getGuardByCode
 * / getDriverByCode, so this card is what a guard or driver scans at the gate. Bottom half
 * of the card is dedicated entirely to the QR code so it's easy to scan at a glance.
 *
 * `.top`/`.bottom` need `min-height: 0` — flex items default to `min-height: auto`, which
 * lets their content refuse to shrink below its natural size. Without it, content taller
 * than half the fixed-height card silently overflows the page and Chrome's print pipeline
 * spills the overflow onto a second page instead of clipping it.
 */
export async function printStaffIdCard({ id, name, role, department }: StaffIdCardParams): Promise<void> {
  const dataUrl = await QRCode.toDataURL(id, { width: 500, margin: 1 });
  const logoUrl = `${window.location.origin}/drive-logo.png`;
  const safeName = escapeHtml(name);
  const safeRole = escapeHtml(role);
  const safeId = escapeHtml(id);
  const safeDepartment = department ? escapeHtml(department) : null;

  const win = window.open("", "_blank", "width=420,height=650");
  if (!win) return;

  win.document.write(`<!doctype html>
<html>
  <head>
    <title>D-RIVE ID — ${safeName}</title>
    <style>
      @page { size: 2.125in 3.375in; margin: 0; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body { margin: 0; padding: 0; }
      body {
        font-family: system-ui, -apple-system, sans-serif;
        width: 2.125in;
        height: 3.375in;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background: #fff;
      }
      .top {
        flex: 1;
        min-height: 0;
        background: linear-gradient(160deg, #0b1220 0%, #131f38 100%);
        color: #fff;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0.16in 0.18in 0.14in;
      }
      .logo { width: 0.8in; height: auto; object-fit: contain; margin-bottom: 0.16in; }
      .name {
        font-size: 16px;
        font-weight: 800;
        text-align: center;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 100%;
      }
      .role {
        margin-top: 0.04in;
        font-size: 11px;
        font-weight: 600;
        color: #7fd4ff;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .department {
        margin-top: 0.02in;
        font-size: 9px;
        color: #8b96b3;
      }
      .id-chip {
        margin-top: auto;
        padding: 0.05in 0.16in;
        border-radius: 999px;
        background: #1e9be0;
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.03em;
        font-variant-numeric: tabular-nums;
      }
      .bottom {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.06in;
        padding: 0.1in;
        border-top: 1px solid #e5e9f2;
      }
      .qr { width: 1.25in; height: 1.25in; }
      .scan-label {
        font-size: 8px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #8b93a7;
      }
    </style>
  </head>
  <body>
    <div class="top">
      <img class="logo" src="${logoUrl}" alt="D-RIVE" />
      <div class="name">${safeName}</div>
      <div class="role">${safeRole}</div>
      ${safeDepartment ? `<div class="department">${safeDepartment}</div>` : ""}
      <div class="id-chip">${safeId}</div>
    </div>
    <div class="bottom">
      <img class="qr" src="${dataUrl}" alt="QR code for ${safeId}" />
      <span class="scan-label">Scan at gate</span>
    </div>
  </body>
</html>`);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
}
