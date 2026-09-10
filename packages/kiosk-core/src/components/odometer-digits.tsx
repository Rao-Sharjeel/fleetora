import { useState } from "react";
import type { DigitReading } from "../lib/odometer-ocr";

interface OdometerDigitsProps {
  /** Current value, one character per digit. */
  value: string;
  onChange: (next: string) => void;
  /** Per-digit detail from the on-device read, or null for the server
   * fallback, which has no per-digit confidence. */
  digits: DigitReading[] | null;
  /** Positions the model wasn't sure about. */
  uncertain: number[];
  /** True when a trailing digit is missing rather than doubtful — a drum
   * caught mid-roll. An empty slot is shown for the operator to fill. */
  missingTrailingDigit?: boolean;
}

/**
 * The reading as individual digits, with the uncertain ones picked out.
 *
 * The model reports a probability per digit, and that localises errors well:
 * on the one real photo that read wrong, the offending digit scored 0.746
 * while every correct digit across every photo scored at least 0.993 — and the
 * true digit was the model's runner-up. So rather than asking the operator to
 * re-check a six-digit number that is almost certainly right, this highlights
 * the one position in doubt and offers the alternatives to tap.
 */
export function OdometerDigits({ value, onChange, digits, uncertain, missingTrailingDigit }: OdometerDigitsProps) {
  const uncertainSet = new Set(uncertain);
  const [active, setActive] = useState<number | null>(uncertain[0] ?? null);

  function setDigit(index: number, digit: string) {
    // Appending when the slot is past the end covers the mid-roll case, where
    // the operator is supplying a digit the model never read.
    const next = index >= value.length ? value + digit : value.slice(0, index) + digit + value.slice(index + 1);
    onChange(next);
    setActive(null);
  }

  // The empty slot is a real position the operator can tap, not decoration.
  const characters = missingTrailingDigit ? [...value.split(""), ""] : value.split("");
  const activeReading = active !== null ? digits?.[active] : undefined;
  // The model's own runner-ups first, then the rest, so the likely fix is
  // nearest the operator's thumb without hiding any option.
  const options = activeReading
    ? [...activeReading.alternatives, ..."0123456789".split("").filter((d) => !activeReading.alternatives.includes(d) && d !== activeReading.digit)]
    : "0123456789".split("");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-center gap-1.5">
        {characters.map((char, index) => {
          const isUncertain = uncertainSet.has(index);
          const isActive = active === index;
          return (
            <button
              key={index}
              type="button"
              onClick={() => setActive(isActive ? null : index)}
              aria-label={
                isUncertain
                  ? `Digit ${index + 1}, ${char}, needs checking`
                  : `Digit ${index + 1}, ${char}`
              }
              className={[
                "h-14 w-10 rounded-lg border text-2xl font-bold tabular-nums transition-colors",
                isActive
                  ? "border-kiosk-accent bg-kiosk-accent/20 text-kiosk-text"
                  : isUncertain
                    ? "border-kiosk-warning bg-kiosk-warning/15 text-kiosk-warning"
                    : "border-kiosk-border bg-kiosk-panel text-kiosk-text",
              ].join(" ")}
            >
              {char || "?"}
            </button>
          );
        })}
      </div>

      {active !== null ? (
        <div className="flex flex-col gap-2 rounded-xl border border-kiosk-border bg-kiosk-panel p-3">
          <span className="text-xs text-kiosk-muted">
            Digit {active + 1}
            {activeReading && ` — read as ${activeReading.digit} (${Math.round(activeReading.confidence * 100)}% sure)`}
          </span>
          <div className="flex flex-wrap gap-2">
            {options.map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => setDigit(active, digit)}
                className="h-12 w-12 rounded-lg border border-kiosk-border bg-kiosk-bg text-xl font-semibold text-kiosk-text active:scale-95"
              >
                {digit}
              </button>
            ))}
          </div>
        </div>
      ) : (
        uncertain.length > 0 && (
          <p className="text-center text-sm text-kiosk-warning">
            {missingTrailingDigit
              ? "The last digit is mid-roll — read it off the vehicle and tap it in."
              : uncertain.length === 1
                ? `Digit ${uncertain[0] + 1} wasn't clear — tap it to correct, or continue if it looks right.`
                : `${uncertain.length} digits weren't clear — tap any to correct.`}
          </p>
        )
      )}
    </div>
  );
}
