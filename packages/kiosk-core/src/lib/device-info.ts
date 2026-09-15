/**
 * A short, human-readable summary of this browser/OS — purely descriptive, so
 * an admin can tell tablets apart on the Kiosk Devices screen ("Android 13 ·
 * Chrome 121"). Never used to authenticate anything; that's installationId's
 * job (see device-session.ts), which this has no bearing on.
 */
export function describeDevice(): string {
  const ua = navigator.userAgent;

  const os =
    (/Android\s([\d.]+)/.exec(ua) && `Android ${RegExp.$1}`) ||
    (/iPhone OS (\d+)_(\d+)/.exec(ua) && `iOS ${RegExp.$1}.${RegExp.$2}`) ||
    (/Mac OS X (\d+)[_.](\d+)/.exec(ua) && `macOS ${RegExp.$1}.${RegExp.$2}`) ||
    (/Windows NT/.test(ua) && "Windows") ||
    "Unknown OS";

  const browser =
    (/Edg\/([\d.]+)/.exec(ua) && `Edge ${RegExp.$1.split(".")[0]}`) ||
    (/Chrome\/([\d.]+)/.exec(ua) && `Chrome ${RegExp.$1.split(".")[0]}`) ||
    (/Version\/([\d.]+).*Safari/.exec(ua) && `Safari ${RegExp.$1.split(".")[0]}`) ||
    (/Firefox\/([\d.]+)/.exec(ua) && `Firefox ${RegExp.$1.split(".")[0]}`) ||
    "";

  return [os, browser].filter(Boolean).join(" · ");
}
