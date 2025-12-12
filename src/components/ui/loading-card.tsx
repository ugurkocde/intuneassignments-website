"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card"
import { Loader2, CheckCircle2 } from "lucide-react"
import { cn } from "~/lib/utils"
import { Badge } from "~/components/ui/badge"
import { ScrollArea } from "~/components/ui/scroll-area"
import { StageIndicator } from "./stage-indicator"
import { AnimatedProgress } from "./animated-progress"

interface LoadingCardProps {
  stage: string;
  progress: number;
  details: string;
}

export function LoadingCard({ stage, progress, details }: LoadingCardProps) {
  const isComplete = progress >= 100;
  const [activity, setActivity] = React.useState<string[]>([]);

  React.useEffect(() => {
    const next = (details || "").trim();
    if (!next) return;

    setActivity((prev) => {
      const last = prev[prev.length - 1];
      if (last === next) return prev;
      const capped = [...prev, next].slice(-5);
      return capped;
    });
  }, [details]);

  return (
    <Card
      className={cn(
        "relative w-full overflow-hidden transition-all duration-500",
        // Responsive width
        "max-w-[90vw] sm:max-w-[500px] md:max-w-[600px] lg:max-w-[700px]",
        // Glassmorphism
        "glass-card dark:glass-card-dark",
        // Styling
        "border-0 shadow-2xl",
        // Explicit padding
        "px-6 py-8 sm:px-10 sm:py-10",
        // Success animation
        isComplete && "scale-[1.02]"
      )}
      role="status"
      aria-live="off"
      aria-label={`Loading progress: ${Math.round(progress)}%`}
    >
      {/* Background accents */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl dark:bg-primary/5" />
        <div className="absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-primary/5 blur-3xl dark:bg-primary/10" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.06] via-transparent to-transparent dark:from-primary/[0.05]" />
      </div>

      <CardHeader className="p-0 pb-8 sm:pb-10">
        <CardTitle className="text-2xl sm:text-3xl flex items-center gap-4 font-semibold tracking-tight">
          <div
            className={cn(
              "relative p-2.5 rounded-xl transition-colors duration-300",
              isComplete ? "bg-green-500/10" : "bg-primary/10"
            )}
          >
            {isComplete ? (
              <CheckCircle2 className="h-7 w-7 sm:h-8 sm:w-8 text-green-500 animate-scale-in" />
            ) : (
              <Loader2 className="h-7 w-7 sm:h-8 sm:w-8 animate-spin text-primary" />
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span className="leading-tight">
              {isComplete ? "Loading Complete" : "Loading Intune Data"}
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              Building your assignment view…
            </span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0 space-y-8 sm:space-y-10">
        <div className="py-2">
          <StageIndicator currentProgress={progress} />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm text-muted-foreground">Current step</div>
              <div className="text-base font-medium text-foreground truncate">
                {stage}
              </div>
            </div>
            <Badge
              variant="secondary"
              className="shrink-0 bg-primary/10 text-primary border border-primary/15 dark:bg-primary/10 dark:border-primary/15 tabular-nums px-3 py-1 text-sm font-semibold"
              aria-label={`${Math.round(progress)} percent`}
            >
              {Math.round(progress)}%
            </Badge>
          </div>
          <AnimatedProgress value={progress} />
        </div>

        <div className="pt-5 border-t border-border/30">
          <div className="text-sm font-medium text-foreground/90">Activity</div>
          <div className="mt-2 space-y-2">
            <p
              className="text-sm text-muted-foreground min-h-[24px] transition-all duration-300 leading-relaxed"
              aria-live="polite"
              aria-atomic="true"
            >
              {details}
            </p>

            <ScrollArea
              className={cn(
                "rounded-lg",
                // Keep the card height stable; scroll within the feed instead of pushing the page/footer.
                "max-h-32 sm:max-h-40",
              )}
              aria-live="off"
            >
              <div className="space-y-1.5 pr-3">
                {activity.slice(0, -1).map((line, idx) => (
                  <div
                    // eslint-disable-next-line react/no-array-index-key
                    key={`${idx}-${line}`}
                    className="flex items-start gap-2 text-xs text-muted-foreground/80 animate-in fade-in slide-in-from-bottom-1 duration-300"
                  >
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/35 shrink-0" />
                    <span className="leading-relaxed line-clamp-2">{line}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
