import { useEffect, useState } from "react";
import { getBuildId } from "../lib/build-info";

/**
 * What the camera is actually doing, for when the preview is black.
 *
 * A black rectangle has two completely different causes that look identical
 * on the phone: no frames are arriving, or frames are arriving and not being
 * drawn. The first is a camera that was taken away — restarting the stream
 * fixes it. The second is a rendering problem in the WebView, where
 * restarting can never help and the numbers below keep ticking regardless.
 *
 * Without this there is no way to tell them apart from a photograph of a
 * black screen, which is all a remote diagnosis has to work with.
 */
export function CameraDiagnostics({
  stream,
  video,
  stalled,
  onClose,
}: {
  stream: MediaStream | null;
  video: HTMLVideoElement | null;
  stalled: boolean;
  onClose: () => void;
}) {
  const [, tick] = useState(0);
  const [advanced, setAdvanced] = useState(0);

  useEffect(() => {
    let last = -1;
    const timer = window.setInterval(() => {
      const now = video?.currentTime ?? -1;
      if (now !== last && now > 0) setAdvanced((n) => n + 1);
      last = now;
      tick((n) => n + 1);
    }, 500);
    return () => window.clearInterval(timer);
  }, [video]);

  const track = stream?.getVideoTracks()[0] ?? null;
  const settings = track?.getSettings?.() ?? {};

  const rows: Array<[string, string]> = [
    ["stream", stream ? "present" : "none"],
    ["track", track ? `${track.readyState} muted=${track.muted} enabled=${track.enabled}` : "none"],
    ["device", String(track?.label || "?").slice(0, 28)],
    ["settings", `${settings.width ?? "?"}x${settings.height ?? "?"} @${Math.round(settings.frameRate ?? 0)}fps`],
    ["video el", video ? `${video.videoWidth}x${video.videoHeight} ready=${video.readyState} paused=${video.paused}` : "none"],
    ["frames", `currentTime advanced ${advanced}x`],
    ["app thinks", stalled ? "STALLED" : "healthy"],
    ["build", getBuildId()],
  ];

  return (
    <div className="absolute inset-0 z-10 flex flex-col gap-2 overflow-auto bg-black/90 p-4 text-left">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white">Camera diagnostics</span>
        <button type="button" onClick={onClose} className="rounded-md bg-white/15 px-2 py-1 text-xs text-white">
          Close
        </button>
      </div>
      <dl className="flex flex-col gap-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-2 text-[11px] leading-tight">
            <dt className="w-20 shrink-0 text-kiosk-muted">{k}</dt>
            <dd className="min-w-0 break-words font-mono text-white">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-1 text-[10px] leading-snug text-kiosk-muted">
        If "frames" keeps climbing while the preview is black, the camera is working and the WebView is not drawing
        it — restarting will not help. If it stays still, the camera is not delivering frames.
      </p>
    </div>
  );
}
