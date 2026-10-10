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
 * Refocuses on a point, given in normalised 0-1 coordinates of the *video
 * frame* (not the element — the caller maps for object-fit: cover first).
 *
 * Asks for the point and a single-shot refocus together, then restores
 * continuous autofocus a moment later: leaving the camera in single-shot means
 * the next vehicle, at a different distance, stays stuck on the old plane.
 */
export async function focusAt(track: MediaStreamTrack, x: number, y: number): Promise<boolean> {
  const ok = await apply(track, {
    pointsOfInterest: [{ x, y }],
    focusMode: "single-shot",
  });
  if (!ok) return false;
  window.setTimeout(() => {
    void apply(track, { focusMode: "continuous" });
  }, 2500);
  return true;
}
