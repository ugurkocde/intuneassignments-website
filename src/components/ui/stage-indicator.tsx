"use client"

import * as React from "react"
import { CheckCircle2, Circle, Loader2 } from "lucide-react"
import { cn } from "~/lib/utils"

interface Stage {
  key: string;
  label: string;
  threshold: number;
}

const STAGES: Stage[] = [
  { key: 'auth', label: 'Authenticating', threshold: 5 },
  { key: 'fetch', label: 'Fetching', threshold: 10 },
  { key: 'process', label: 'Processing', threshold: 70 },
  { key: 'resolve', label: 'Resolving', threshold: 85 },
  { key: 'complete', label: 'Complete', threshold: 100 },
];

interface StageIndicatorProps {
  currentProgress: number;
  className?: string;
}

type StageStatus = 'completed' | 'active' | 'upcoming';

function getCurrentStageIndex(progress: number): number {
  for (let i = STAGES.length - 1; i >= 0; i--) {
    const stage = STAGES[i];
    if (stage && progress >= stage.threshold) {
      return i;
    }
  }
  return 0;
}

function getStageStatus(stageIndex: number, currentIndex: number): StageStatus {
  if (stageIndex < currentIndex) return 'completed';
  if (stageIndex === currentIndex) return 'active';
  return 'upcoming';
}

interface StageNodeProps {
  stage: Stage;
  status: StageStatus;
}

function StageNode({ stage, status }: StageNodeProps) {
  return (
    <div className="flex flex-col items-center gap-2 min-w-[76px] sm:min-w-[96px]">
      <div
        className={cn(
          "relative h-12 w-12 rounded-full flex items-center justify-center transition-all duration-300",
          status === "active" && "bg-primary/10 ring-1 ring-primary/20",
          status === "completed" && "bg-green-500/10 ring-1 ring-green-500/20",
          status === "upcoming" && "bg-muted/20 ring-1 ring-border/40 opacity-70",
        )}
      >
        {status === "active" && (
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse-glow" />
        )}
        {status === 'completed' && (
          <CheckCircle2 className="relative z-10 h-8 w-8 text-green-500 animate-scale-in" strokeWidth={2} />
        )}
        {status === 'active' && (
          <div className="relative z-10 h-8 w-8">
            <Circle className="h-8 w-8 fill-primary/20 text-primary" strokeWidth={2} />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-primary" strokeWidth={2.5} />
            </div>
          </div>
        )}
        {status === 'upcoming' && (
          <Circle className="relative z-10 h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
        )}
      </div>
      <span className={cn(
        "text-xs sm:text-sm font-medium text-center transition-all duration-300 leading-snug",
        status === 'completed' && "text-green-600 dark:text-green-400",
        status === 'active' && "text-primary font-semibold",
        status === 'upcoming' && "text-muted-foreground/60"
      )}>
        {stage.label}
      </span>
    </div>
  );
}

interface ConnectionLineProps {
  completed: boolean;
}

function ConnectionLine({ completed }: ConnectionLineProps) {
  return (
    <div className="flex-1 flex items-center px-1 sm:px-2 mt-6">
      <div className="w-full h-[2px] relative rounded-full overflow-hidden">
        <div className="absolute inset-0 bg-muted/40" />
        <div className={cn(
          "h-full transition-all duration-700 ease-out rounded-full bg-primary",
          completed ? "w-full" : "w-0"
        )} />
      </div>
    </div>
  );
}

export function StageIndicator({
  currentProgress,
  className
}: StageIndicatorProps) {
  const currentIndex = getCurrentStageIndex(currentProgress);

  return (
    <div className={cn(
      // Top-align so connector placement is based on the circle, not the combined (circle+label) height.
      "flex items-start justify-between w-full",
      "max-sm:flex-col max-sm:items-center max-sm:gap-4",
      className
    )}>
      {STAGES.map((stage, index) => (
        <React.Fragment key={stage.key}>
          <StageNode
            stage={stage}
            status={getStageStatus(index, currentIndex)}
          />
          {index < STAGES.length - 1 && (
            <div className="hidden sm:flex flex-1">
              <ConnectionLine completed={index < currentIndex} />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
