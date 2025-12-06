"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card"
import { Loader2, CheckCircle2 } from "lucide-react"
import { cn } from "~/lib/utils"
import { StageIndicator } from "./stage-indicator"
import { AnimatedProgress } from "./animated-progress"

interface LoadingCardProps {
  stage: string;
  progress: number;
  details: string;
}

export function LoadingCard({ stage, progress, details }: LoadingCardProps) {
  const isComplete = progress >= 100;

  return (
    <Card
      className={cn(
        "relative w-full overflow-hidden transition-all duration-500",
        // Responsive width
        "max-w-[90vw] sm:max-w-[500px] md:max-w-[600px] lg:max-w-[700px]",
        // Glassmorphism
        "bg-white/90 dark:bg-gray-900/90",
        "supports-[backdrop-filter]:glass-card",
        // Styling
        "border-0 shadow-2xl",
        // Explicit padding
        "px-6 py-8 sm:px-10 sm:py-10",
        // Success animation
        isComplete && "scale-[1.02]"
      )}
      role="status"
      aria-live="polite"
      aria-label={`Loading progress: ${Math.round(progress)}%`}
    >
      <CardHeader className="p-0 pb-8 sm:pb-10">
        <CardTitle className="text-2xl sm:text-3xl flex items-center gap-4 font-semibold tracking-tight">
          <div className={cn(
            "p-2.5 rounded-xl transition-colors duration-300",
            isComplete ? "bg-green-500/10" : "bg-primary/10"
          )}>
            {isComplete ? (
              <CheckCircle2 className="h-7 w-7 sm:h-8 sm:w-8 text-green-500 animate-scale-in" />
            ) : (
              <Loader2 className="h-7 w-7 sm:h-8 sm:w-8 animate-spin text-primary" />
            )}
          </div>
          <span>{isComplete ? "Loading Complete" : "Loading Intune Data"}</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0 space-y-8 sm:space-y-10">
        <div className="py-2">
          <StageIndicator currentProgress={progress} />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-baseline">
            <span className="text-base font-medium text-foreground">{stage}</span>
            <span className="text-lg font-bold text-primary tabular-nums">
              {Math.round(progress)}%
            </span>
          </div>
          <AnimatedProgress value={progress} />
        </div>

        <div className="pt-4 border-t border-border/30">
          <p className="text-sm text-muted-foreground min-h-[24px] transition-all duration-300">
            {details}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
