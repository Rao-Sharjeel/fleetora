import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "border-primary/25 bg-primary/10 text-primary",
        secondary: "border-secondary/30 bg-secondary/10 text-secondary",
        accent: "border-accent/30 bg-accent/10 text-accent",
        success: "border-success/30 bg-success/10 text-success",
        warning: "border-warning/30 bg-warning/10 text-warning",
        destructive: "border-destructive/30 bg-destructive/10 text-destructive",
        outline: "border-border text-foreground",
        muted: "border-transparent bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const dotVariants: Record<string, string> = {
  default: "bg-primary",
  secondary: "bg-secondary",
  accent: "bg-accent",
  success: "bg-success shadow-[0_0_6px_hsl(var(--success)/0.8)]",
  warning: "bg-warning shadow-[0_0_6px_hsl(var(--warning)/0.8)]",
  destructive: "bg-destructive shadow-[0_0_6px_hsl(var(--destructive)/0.8)]",
  outline: "bg-foreground/40",
  muted: "bg-muted-foreground/50",
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant = "default", dot = true, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotVariants[variant ?? "default"])} />}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
