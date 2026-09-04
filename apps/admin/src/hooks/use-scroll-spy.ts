import { useEffect, useRef, useState } from "react";

// Takes the container DOM node directly (not a ref object) — a plain useRef's identity never
// changes, so an effect depending on it won't re-run once the node actually mounts (e.g. inside
// a dialog that starts closed). Pair with a useState-backed callback ref so this re-fires when
// the node appears.
export function useScrollSpy(ids: string[], container: HTMLElement | null) {
  const [activeId, setActiveId] = useState(ids[0]);
  // Accumulates each section's intersecting state across callbacks — an IntersectionObserver
  // callback only reports entries whose status changed since the last check, not every
  // observed element, so we can't derive "what's visible now" from a single callback alone.
  const intersecting = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          intersecting.current[entry.target.id] = entry.isIntersecting;
        }
        const topmostVisible = ids.find((id) => intersecting.current[id]);
        if (topmostVisible) setActiveId(topmostVisible);
      },
      { root: container, rootMargin: "0px 0px -70% 0px", threshold: 0 },
    );

    const elements = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [ids, container]);

  return activeId;
}
