"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "~/lib/utils"

interface AnimatedProgressProps extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  value?: number;
  showGlow?: boolean;
}

export function AnimatedProgress({
  className,
  value,
  showGlow = true,
  ...props
}: AnimatedProgressProps) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative h-3 sm:h-4 w-full overflow-hidden rounded-full",
        // Track contrast (especially in light mode)
        "bg-primary/10 dark:bg-muted/35",
        "shadow-inner ring-1 ring-primary/15 dark:ring-border/30",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "h-full w-full flex-1 transition-all duration-500 ease-out will-change-transform",
          "relative overflow-hidden rounded-full progress-shimmer",
          showGlow &&
            "shadow-[0_0_28px_color-mix(in_oklab,var(--primary)_35%,transparent)]"
        )}
        style={{
          transform: `translateX(-${100 - (value ?? 0)}%)`,
        }}
      />
    </ProgressPrimitive.Root>
  );
}
