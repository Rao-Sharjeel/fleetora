interface OdometerDigitsProps {
  reading: string;
  /** 0-based positions the reader was not sure of. */
  uncertainPositions?: number[];
}

/**
 * The reading, with any digit the reader doubted marked out.
 *
 * Readings used to be all-or-nothing: every digit at 0.95+ or the whole thing
 * was discarded as unreadable. That threw away correct readings over a single
 * marginal digit — a 389775 where one glyph scored 0.94 — and sent the guard
 * back to rephotograph a cluster that was already perfectly legible.
 *
 * The reader always knew *which* digit it doubted; nothing displayed it. A
 * marked digit next to the photo asks the person standing at the vehicle to
 * check one character, which is a question they can answer better than the
 * model can.
 */
export function OdometerDigits({ reading, uncertainPositions = [] }: OdometerDigitsProps) {
  const uncertain = new Set(uncertainPositions);
  return (
    <span className="flex items-baseline gap-0.5 text-3xl font-bold tabular-nums text-kiosk-text">
      {reading.split("").map((digit, i) => (
        <span
          key={i}
          className={
            uncertain.has(i)
              ? "rounded-md bg-kiosk-warning/20 px-1 text-kiosk-warning underline decoration-dotted decoration-2 underline-offset-4"
              : undefined
          }
        >
          {digit}
        </span>
      ))}
    </span>
  );
}
