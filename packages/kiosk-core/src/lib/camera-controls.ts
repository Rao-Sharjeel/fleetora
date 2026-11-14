/**
 * Torch, zoom and tap-to-focus for the capture screen.
 *
 * These live behind MediaStreamTrack capabilities that TypeScript's DOM lib
 * doesn't describe (they're standardised in the Image Capture spec but not in
 * lib.dom), so the casts here are the narrow seam where that gap is crossed
 * rather than widening every constraint type in the app.
 *
 * Support is uneven and that is the normal case, not an error: Android Chrome
 * generally has all three, iOS Safari has none of them. Everything below
 * reports what a given track actually offers so the UI can show only the
 * controls that will do something, and every apply is best-effort.
 */

interface ExtendedCapabilities {
  torch?: boolean;
  zoom?: { min: number; max: number; step?: number };
  focusMode?: string[];
  focusDistance?: { min: number; max: number; step?: number };
  pointsOfInterest?: unknown;
}

export interface CameraCapabilities {
  torch: boolean;
  zoom: { min: number; max: number; step: number } | null;
  /** Whether a tap can ask the camera to refocus on a point. */
  tapToFocus: boolean;
}

function capabilitiesOf(track: MediaStreamTrack): ExtendedCapabilities {
  // getCapabilities is itself absent on some older WebViews.
  return (track.getCapabilities?.() ?? {}) as ExtendedCapabilities;
}

export function readCapabilities(track: MediaStreamTrack | null): CameraCapabilities {
  if (!track) return { torch: false, zoom: null, tapToFocus: false };
  const caps = capabilitiesOf(track);
  const focusModes = caps.focusMode ?? [];
  return {
    torch: caps.torch === true,
    zoom:
      caps.zoom && caps.zoom.max > caps.zoom.min
        ? { min: caps.zoom.min, max: caps.zoom.max, step: caps.zoom.step ?? 0.1 }
        : null,
    // "single-shot" is the one that actually refocuses on demand. "manual"
    // without a point of interest only lets focusDistance be set directly,
    // which is not what a tap means.
    tapToFocus: focusModes.includes("single-shot") || caps.pointsOfInterest !== undefined,
  };
}

async function apply(track: MediaStreamTrack, constraint: Record<string, unknown>): Promise<boolean> {
  try {
    await track.applyConstraints({ advanced: [constraint] } as MediaTrackConstraints);
    return true;
  } catch {
    // A device can advertise a capability and still refuse a specific value.
    // Callers treat this as "the control did nothing", never as a failure of
    // the capture itself.
    return false;
  }
}

export function setTorch(track: MediaStreamTrack, on: boolean): Promise<boolean> {
  return apply(track, { torch: on });
}

export function setZoom(track: MediaStreamTrack, zoom: number): Promise<boolean> {
  return apply(track, { zoom });
}

/**
 * Asks the camera to refocus on a point, given in normalised 0-1 coordinates
 * of the *video frame* (not the element — the caller maps for object-fit:
 * cover first).
 *
 * Returns a handle rather than a bare boolean because of what the restore
 * timer does to a capture. Single-shot focus has to be handed back to
 * continuous afterwards — leaving the camera in single-shot means the next
 * vehicle, at a different distance, stays stuck on the old plane — but if that
 * restore lands while a capture is waiting for focus, the camera starts
 * hunting again from scratch and the frame it waited for is gone. The capture
 * path cancels the timer for exactly that window.
 *
 * `restoreAfterMs: 0` skips the timer entirely, for a caller that will restore
 * continuous focus itself once it has its frames.
 */
export interface FocusRequest {
  /** Whether the device accepted the refocus at all. */
  ok: boolean;
  /** Cancels the pending hand-back to continuous autofocus. */
  cancelRestore: () => void;
}

export async function focusAt(
  track: MediaStreamTrack,
  x: number,
  y: number,
  restoreAfterMs = 2500,
): Promise<FocusRequest> {
  const ok = await apply(track, {
    pointsOfInterest: [{ x, y }],
    focusMode: "single-shot",
  });
  if (!ok || restoreAfterMs <= 0) return { ok, cancelRestore: () => {} };
  const timer = window.setTimeout(() => {
    void restoreContinuousFocus(track);
  }, restoreAfterMs);
  return { ok, cancelRestore: () => window.clearTimeout(timer) };
}

/** Hands the camera back to continuous autofocus. */
export function restoreContinuousFocus(track: MediaStreamTrack): Promise<boolean> {
  return apply(track, { focusMode: "continuous" });
}
