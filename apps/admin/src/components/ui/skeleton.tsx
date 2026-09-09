import { cn } from "@/lib/utils";

/**
 * Placeholder block shown in the shape of the content that is still loading.
 * `aria-hidden` because the surrounding region carries the real announcement —
 * a screen reader should hear "loading", not a dozen empty boxes.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

/** A skeleton sized like a line of text, with a little width jitter so a stack
 * of them reads as prose rather than as a solid block. */
export function SkeletonText({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn("h-4 w-full", className)} {...props} />;
}
