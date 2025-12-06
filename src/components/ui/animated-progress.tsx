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
        "bg-muted/50 shadow-inner",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "h-full w-full flex-1 transition-all duration-500 ease-out",
          "relative overflow-hidden rounded-full",
          showGlow && "shadow-[0_0_24px_rgba(var(--color-primary),0.4)]"
        )}
        style={{
          transform: `translateX(-${100 - (value ?? 0)}%)`,
          background: "linear-gradient(90deg, var(--primary) 0%, var(--primary-foreground) 50%, var(--primary) 100%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 2.5s ease-in-out infinite"
        }}
      />
    </ProgressPrimitive.Root>
  );
}
