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

export type StaffIdCardVariant = "driver" | "guard";

export interface StaffIdCardParams {
  /** Drives the accent colour and the sideways role word. */
  variant: StaffIdCardVariant;
  /** The D-RIVE ID encoded in the QR — a Guard's guardId or a Driver's employeeId. */
  id: string;
  name: string;
  cnic: string;
  mobile: string;
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
// TODO: "Dynamic Sportswear" + its logo are hardcoded for this deployment.
// Fleetora is multi-tenant (other companies use the same app), so if this
// card is ever printed for a different tenant, both need to come from that
// tenant's own branding instead of being fixed here.
const COMPANY_NAME = "Dynamic Sportswear";

/**
 * Per-variant colour, taken from the admin theme's raw palette in
 * styles/themes/default.css and converted from HSL to hex (print needs literals,
 * and the print window does not load the app's stylesheets). `deep` is the
 * darkened pair that stays legible as text on white; `ink` tints the header
 * gradient so a driver badge and a guard badge differ at a glance across a gate.
 */
const VARIANTS: Record<StaffIdCardVariant, { role: string; accent: string; deep: string; ink: [string, string] }> = {
  driver: { role: "Driver", accent: "#0084ff", deep: "#0a5fb4", ink: ["#0b1220", "#131f38"] },
  guard: { role: "Guard", accent: "#3e9970", deep: "#256a4a", ink: ["#0a1512", "#12271f"] },
};

/**
 * Opens a print-ready D-RIVE staff ID card whose QR encodes the person's D-RIVE ID —
 * the same ID the Exit/Entry/Fuel kiosks resolve via getGuardByCode / getDriverByCode,
 * so this card is what a guard or driver scans at the gate.
 *
 * Trim size is 2in x 3in portrait, not CR80: these are laminated and cut in-house
 * rather than printed onto pre-cut PVC blanks.
 *
 * Every dimension is expressed against `--in` so the whole layout is stated in real
 * inches and the vertical budget is checkable by reading it: punch 0.24 / header 0.45 /
 * accent rule 0.03 / identity 0.83 / data rows ~0.29 (the one flexible band) /
 * QR footer 1.16. The top band is deliberately free of ink so a slot punch never cuts
 * artwork, and the QR gets the bottom third outright because scanning is the card's job.
 *
 * `.c-data` needs `min-height: 0` — flex items default to `min-height: auto`, which lets
 * content refuse to shrink below its natural size; without it, a long value silently
 * overflows the fixed-height card and Chrome's print pipeline spills it onto a second
 * page instead of clipping it.
 */
export async function printStaffIdCard({ variant, id, name, cnic, mobile, photoUrl }: StaffIdCardParams): Promise<void> {
  const dataUrl = await QRCode.toDataURL(id, { width: 640, margin: 0 });
  const driveLogoUrl = `${window.location.origin}/drive-logo.png`;
  const companyLogoUrl = `${window.location.origin}/dynamic-logo.png`;
  const v = VARIANTS[variant];
  const safeName = escapeHtml(name);
  const safeId = escapeHtml(id);
  const safeCnic = escapeHtml(cnic);
  const safeMobile = escapeHtml(mobile);
  const safeRole = escapeHtml(v.role);
  const safeCompanyName = escapeHtml(COMPANY_NAME);
  const initial = escapeHtml(name.charAt(0).toUpperCase());

  const win = window.open("", "_blank", "width=420,height=650");
  if (!win) return;

  win.document.write(`<!doctype html>
<html>
  <head>
    <title>D-RIVE ID — ${safeName}</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@600;700;800&family=Barlow+Condensed:wght@600;700&family=IBM+Plex+Mono:wght@600;700&display=swap" />
    <style>
      @page { size: 2in 3in; margin: 0; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body { margin: 0; padding: 0; background: #fff; }
      .card {
        --in: 1in;
        --accent: ${v.accent};
        --accent-deep: ${v.deep};
        --ink-a: ${v.ink[0]};
        --ink-b: ${v.ink[1]};
        width: calc(var(--in) * 2);
        height: calc(var(--in) * 3);
        overflow: hidden;
        background: #fff;
        color: #101722;
        font-family: "Barlow", system-ui, -apple-system, sans-serif;
        display: flex;
        flex-direction: column;
      }

      /* Punch zone — kept clear of ink so a slot punch never cuts artwork. */
      .c-punch { flex: 0 0 auto; height: calc(var(--in) * 0.24); background: #fff; }

      .c-head {
        flex: 0 0 auto;
        background: linear-gradient(158deg, var(--ink-a) 0%, var(--ink-b) 100%);
        padding: calc(var(--in) * 0.075) calc(var(--in) * 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: calc(var(--in) * 0.08);
      }
      /* Splitting the lockup lets the company mark take the full band height
         instead of matching the D-RIVE wordmark's cap height. */
      .c-brand-left { display: grid; gap: calc(var(--in) * 0.04); justify-items: center; }
      .c-logo-drive { height: calc(var(--in) * 0.17); width: auto; object-fit: contain; display: block; }
      .c-logo-company { height: calc(var(--in) * 0.3); width: auto; object-fit: contain; display: block; }
      .c-rule-v { width: 1px; height: calc(var(--in) * 0.32); background: rgba(255, 255, 255, 0.28); flex: 0 0 auto; }
      .c-company {
        font-family: "Barlow Condensed", "Barlow", sans-serif;
        font-size: calc(var(--in) * 0.09);
        font-weight: 600;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.78);
        line-height: 1;
        white-space: nowrap;
      }
      .c-accentbar { flex: 0 0 auto; height: calc(var(--in) * 0.03); background: var(--accent); }

      /* Identity — the photo sits beside the name rather than above it, which is
         what frees the vertical room the QR needs. */
      .c-id {
        flex: 0 0 auto;
        display: flex;
        gap: calc(var(--in) * 0.085);
        align-items: center;
        padding: calc(var(--in) * 0.065) calc(var(--in) * 0.1);
      }
      .c-photo {
        flex: 0 0 auto;
        width: calc(var(--in) * 0.7);
        height: calc(var(--in) * 0.7);
        border-radius: calc(var(--in) * 0.04);
        overflow: hidden;
        background: #dfe5ee;
        border: 1.5px solid var(--accent);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .c-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .c-photo .initial { font-size: calc(var(--in) * 0.26); font-weight: 800; color: #97a3b6; }
      .c-idtext { min-width: 0; display: grid; gap: calc(var(--in) * 0.035); }
      .c-name {
        font-size: calc(var(--in) * 0.115);
        font-weight: 800;
        line-height: 1.12;
        letter-spacing: -0.01em;
        overflow-wrap: anywhere;
      }
      .c-empid {
        font-family: "IBM Plex Mono", ui-monospace, monospace;
        font-size: calc(var(--in) * 0.082);
        font-weight: 700;
        letter-spacing: 0.02em;
      }

      /* Data rows — a label rail keeps both values on one optical column. */
      .c-data {
        flex: 1 1 auto;
        min-height: 0;
        display: grid;
        align-content: center;
        gap: calc(var(--in) * 0.03);
        margin: 0;
        padding: 0 calc(var(--in) * 0.1);
      }
      .c-row {
        display: grid;
        grid-template-columns: calc(var(--in) * 0.35) minmax(0, 1fr);
        gap: calc(var(--in) * 0.05);
        align-items: baseline;
        padding-bottom: calc(var(--in) * 0.028);
        border-bottom: 1px solid #edf0f5;
      }
      .c-row:last-child { border-bottom: 0; padding-bottom: 0; }
      .c-row dt {
        font-family: "Barlow Condensed", "Barlow", sans-serif;
        font-size: calc(var(--in) * 0.062);
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: #8994a6;
      }
      .c-row dd {
        margin: 0;
        font-family: "IBM Plex Mono", ui-monospace, monospace;
        font-variant-numeric: tabular-nums;
        font-size: calc(var(--in) * 0.068);
        font-weight: 600;
        line-height: 1.25;
        letter-spacing: -0.01em;
        color: #1d2634;
        overflow-wrap: anywhere;
      }

      .c-foot {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: calc(var(--in) * 0.085);
        padding: calc(var(--in) * 0.05) calc(var(--in) * 0.1) calc(var(--in) * 0.055);
        border-top: 1px solid #e3e8f0;
        background: #f7f9fc;
      }
      /* The role reads bottom-to-top down the QR's left edge — legible at arm's
         length, and it is what separates a driver badge from a guard badge. */
      .c-rolebar {
        flex: 0 0 auto;
        writing-mode: vertical-rl;
        transform: rotate(180deg);
        font-family: "Barlow Condensed", "Barlow", sans-serif;
        font-size: calc(var(--in) * 0.235);
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        line-height: 1;
        color: var(--accent);
        max-height: calc(var(--in) * 1.05);
        overflow: hidden;
      }
      .c-qr { width: calc(var(--in) * 1.05); height: calc(var(--in) * 1.05); display: block; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="c-punch"></div>
      <div class="c-head">
        <div class="c-brand-left">
          <img class="c-logo-drive" src="${driveLogoUrl}" alt="D-RIVE" />
          <div class="c-company">${safeCompanyName}</div>
        </div>
        <span class="c-rule-v"></span>
        <img class="c-logo-company" src="${companyLogoUrl}" alt="${safeCompanyName}" />
      </div>
      <div class="c-accentbar"></div>
      <div class="c-id">
        <div class="c-photo">
          ${
            photoUrl
              ? `<img src="${photoUrl}" alt="${safeName}" onerror="this.outerHTML='<span class=&quot;initial&quot;>${initial}</span>'" />`
              : `<span class="initial">${initial}</span>`
          }
        </div>
        <div class="c-idtext">
          <div class="c-name">${safeName}</div>
          <div class="c-empid">${safeId}</div>
        </div>
      </div>
      <dl class="c-data">
        <div class="c-row"><dt>CNIC</dt><dd>${safeCnic}</dd></div>
        <div class="c-row"><dt>Mobile</dt><dd>${safeMobile}</dd></div>
      </dl>
      <div class="c-foot">
        <div class="c-rolebar">${safeRole}</div>
        <img class="c-qr" src="${dataUrl}" alt="QR code for ${safeId}" />
      </div>
    </div>
  </body>
</html>`);
  win.document.close();
  win.onload = () => {
    win.focus();
    // The card's whole layout is sized in inches around Barlow's metrics, so
    // printing before the webfonts land would lay it out in the fallback face.
    // The race keeps an offline deployment (no fonts.googleapis.com) printing
    // anyway rather than hanging on a promise that never settles.
    const fonts = win.document.fonts?.ready ?? Promise.resolve();
    Promise.race([fonts, new Promise((resolve) => win.setTimeout(resolve, 1500))]).then(() => win.print());
  };
}
