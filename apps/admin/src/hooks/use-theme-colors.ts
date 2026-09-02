import { useEffect, useState } from "react";
import { useThemeStore } from "@/hooks/use-theme";

/** Resolves `--token` CSS custom properties to real `hsl(...)` strings, reactive to theme changes — for contexts (SVG/canvas chart libraries) that don't reliably resolve `var()` themselves. */
export function useThemeColors<T extends Record<string, string>>(tokens: T): Record<keyof T, string> {
  const mode = useThemeStore((s) => s.mode);
  const [colors, setColors] = useState(() => resolve(tokens));

  useEffect(() => {
    setColors(resolve(tokens));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return colors;
}

function resolve<T extends Record<string, string>>(tokens: T): Record<keyof T, string> {
  const styles = typeof window !== "undefined" ? getComputedStyle(document.documentElement) : null;
  const out = {} as Record<keyof T, string>;
  for (const key in tokens) {
    const raw = styles?.getPropertyValue(`--${tokens[key]}`).trim();
    out[key] = raw ? `hsl(${raw})` : "currentColor";
  }
  return out;
}
