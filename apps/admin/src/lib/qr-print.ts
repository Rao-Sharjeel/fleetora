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
  /** The person's photo (already square-cropped at capture time). Falls back to
   * an initial-letter avatar when absent. */
  photoUrl?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Both brand logos are white artwork on a transparent background (made for the
// app's dark sidebar), so the card's header stays on the same dark gradient
// instead of a light one — a light header would make them invisible.
// TODO: "Dynamic Sportsware" + its logo are hardcoded for this deployment.
// Fleetora is multi-tenant (other companies use the same app), so if this
// card is ever printed for a different tenant, both need to come from that
// tenant's own branding instead of being fixed here.
const COMPANY_NAME = "Dynamic Sportsware";

/**
 * Opens a print-ready D-RIVE staff ID card (portrait CR80 badge size) whose QR encodes the
 * person's D-RIVE ID — the same ID the Exit/Entry/Fuel kiosks resolve via getGuardByCode
 * / getDriverByCode, so this card is what a guard or driver scans at the gate.
 *
 * Three stacked sections (header branding / photo+identity / QR) rather than the
 * old fixed 50/50 split, so the photo has room to read as an actual ID photo.
 * `.identity` needs `min-height: 0` — flex items default to `min-height: auto`,
 * which lets content refuse to shrink below its natural size; without it, content
 * taller than its share of the fixed-height card silently overflows the page and
 * Chrome's print pipeline spills the overflow onto a second page instead of
 * clipping it.
 */
export async function printStaffIdCard({ id, name, role, photoUrl }: StaffIdCardParams): Promise<void> {
  const dataUrl = await QRCode.toDataURL(id, { width: 500, margin: 1 });
  const driveLogoUrl = `${window.location.origin}/drive-logo.png`;
  const companyLogoUrl = `${window.location.origin}/dynamic-logo.png`;
  const safeName = escapeHtml(name);
  const safeRole = escapeHtml(role);
  const safeId = escapeHtml(id);
  const safeCompanyName = escapeHtml(COMPANY_NAME);
  const initial = escapeHtml(name.charAt(0).toUpperCase());

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
      .header {
        flex: 0 0 auto;
        background: linear-gradient(160deg, #0b1220 0%, #131f38 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.05in;
        padding: 0.13in 0.18in 0.1in;
      }
      .brand-row { display: flex; align-items: center; gap: 0.1in; }
      .brand-logo { height: 0.22in; width: auto; object-fit: contain; }
      .brand-divider { width: 1px; height: 0.18in; background: rgba(255, 255, 255, 0.25); }
      .company-name {
        font-size: 7.5px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #9fb3d9;
      }
      .identity {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.05in;
        padding: 0.08in 0.18in;
      }
      .photo-frame {
        width: 0.8in;
        height: 0.8in;
        border-radius: 50%;
        overflow: hidden;
        border: 3px solid #1e9be0;
        background: #e7ecf5;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .photo-frame img { width: 100%; height: 100%; object-fit: cover; }
      .photo-fallback { font-size: 26px; font-weight: 800; color: #8b96b3; }
      .name {
        flex-shrink: 0;
        font-size: 14px;
        font-weight: 800;
        color: #111827;
        text-align: center;
        line-height: 1.25;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 100%;
      }
      .role {
        flex-shrink: 0;
        font-size: 10px;
        font-weight: 700;
        color: #1e9be0;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        line-height: 1.3;
      }
      .id-chip {
        flex-shrink: 0;
        padding: 0.04in 0.15in;
        border-radius: 999px;
        background: #0b1220;
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        line-height: 1.3;
        letter-spacing: 0.03em;
        font-variant-numeric: tabular-nums;
      }
      .qr-section {
        flex: 0 0 auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.04in;
        padding: 0.08in 0.1in 0.12in;
        border-top: 1px solid #e5e9f2;
      }
      .qr { width: 0.9in; height: 0.9in; }
      .scan-label {
        font-size: 7.5px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #8b93a7;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="brand-row">
        <img class="brand-logo" src="${driveLogoUrl}" alt="D-RIVE" />
        <span class="brand-divider"></span>
        <img class="brand-logo" src="${companyLogoUrl}" alt="${safeCompanyName}" />
      </div>
      <div class="company-name">${safeCompanyName}</div>
    </div>
    <div class="identity">
      <div class="photo-frame">
        ${
          photoUrl
            ? `<img src="${photoUrl}" alt="${safeName}" onerror="this.outerHTML='<span class=&quot;photo-fallback&quot;>${initial}</span>'" />`
            : `<span class="photo-fallback">${initial}</span>`
        }
      </div>
      <div class="name">${safeName}</div>
      <div class="role">${safeRole}</div>
      <div class="id-chip">${safeId}</div>
    </div>
    <div class="qr-section">
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
