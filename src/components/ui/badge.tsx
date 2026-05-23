import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  // Refined tonal pill. Flat surface, no border by default. Used heavily
  // for status / SLA / priority — keep visual weight low and consistent.
  "inline-flex items-center rounded-md px-1.5 h-5 text-[11px] font-medium leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-ring/60 focus:ring-offset-1",
  {
    variants: {
      // FIVE semantic variants — that's it. Pick the one that matches the
      // *meaning* of the value, not the visual tone you want.
      variant: {
        neutral:  "bg-muted text-foreground",
        info:     "bg-info/10 text-info",
        success:  "bg-success/10 text-success",
        warning:  "bg-warning/10 text-warning",
        critical: "bg-destructive/10 text-destructive",

        // Aliases — back-compat with existing call sites. Prefer the
        // semantic names above for new code.
        default:     "bg-muted text-foreground",
        secondary:   "bg-muted text-foreground",
        destructive: "bg-destructive/10 text-destructive",

        // Special tones for emphasis (use sparingly)
        solid:   "bg-foreground text-background",
        outline: "border border-border bg-transparent text-foreground",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
