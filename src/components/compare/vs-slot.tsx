"use client";

import { User, Monitor, Users, Plus, X } from "lucide-react";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import type { CompareSubject } from "~/types/compare";

type VSSlotProps = {
  position: "left" | "right";
  subject: CompareSubject | null;
  onClick: () => void;
  onClear: () => void;
  className?: string;
};

const getSubjectStyle = (type: CompareSubject["type"]) => {
  switch (type) {
    case "user":
      return {
        icon: <User className="h-7 w-7 text-primary" />,
        iconBg: "bg-primary/10",
        badgeColor: "bg-primary/10 text-primary border-primary/20",
        label: "User",
      };
    case "device":
      return {
        icon: <Monitor className="h-7 w-7 text-blue-600" />,
        iconBg: "bg-blue-500/10",
        badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        label: "Device",
      };
    case "group":
      return {
        icon: <Users className="h-7 w-7 text-purple-600" />,
        iconBg: "bg-purple-500/10",
        badgeColor: "bg-purple-500/10 text-purple-600 border-purple-500/20",
        label: "Group",
      };
  }
};

export function VSSlot({ position, subject, onClick, onClear, className }: VSSlotProps) {
  if (!subject) {
    // Empty state
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "relative min-h-[200px] rounded-xl border-2 border-dashed border-border",
          "bg-muted/20 hover:bg-muted/40 hover:border-primary/40",
          "transition-all duration-200 cursor-pointer",
          "flex flex-col items-center justify-center gap-4",
          "group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          className
        )}
        aria-label={`Add ${position} comparison item`}
      >
        <div
          className={cn(
            "h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center",
            "group-hover:bg-primary/10 group-hover:scale-110 transition-all duration-200"
          )}
        >
          <Plus className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            Click to add
          </p>
          <p className="text-xs text-muted-foreground/70">
            User, device, or group
          </p>
        </div>
      </button>
    );
  }

  // Filled state
  const style = getSubjectStyle(subject.type);

  return (
    <div
      className={cn(
        "relative min-h-[200px] rounded-xl",
        "glass-card dark:glass-card-dark",
        "p-6 transition-all duration-200",
        "group",
        className
      )}
    >
      {/* Clear button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClear();
        }}
        className={cn(
          "absolute top-3 right-3 z-10",
          "h-8 w-8 rounded-full",
          "bg-background/80 border border-border shadow-sm",
          "flex items-center justify-center",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
          "hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 focus-visible:opacity-100"
        )}
        aria-label={`Remove ${subject.label} from comparison`}
      >
        <X className="h-4 w-4" />
      </button>

      {/* Content */}
      <button
        type="button"
        onClick={onClick}
        className="w-full h-full flex flex-col items-center justify-center text-center gap-4 cursor-pointer focus:outline-none"
        aria-label={`Change ${position} comparison item (currently ${subject.label})`}
      >
        {/* Type icon */}
        <div
          className={cn(
            "h-16 w-16 rounded-full flex items-center justify-center",
            "transition-transform duration-200 group-hover:scale-105",
            style.iconBg
          )}
        >
          {style.icon}
        </div>

        {/* Name */}
        <div className="space-y-1 max-w-full">
          <h3 className="font-semibold text-lg truncate px-2">{subject.label}</h3>
          {subject.subtitle && (
            <p className="text-sm text-muted-foreground truncate px-2">
              {subject.subtitle}
            </p>
          )}
        </div>

        {/* Type badge */}
        <Badge variant="outline" className={cn("font-medium", style.badgeColor)}>
          {style.label}
        </Badge>

        {/* Hover overlay hint */}
        <div
          className={cn(
            "absolute inset-0 rounded-xl",
            "bg-black/5 dark:bg-white/5",
            "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
            "flex items-end justify-center pb-4 pointer-events-none"
          )}
        >
          <span className="text-xs font-medium bg-background/90 dark:bg-background/80 px-3 py-1.5 rounded-full shadow-sm border border-border/50">
            Click to change
          </span>
        </div>
      </button>
    </div>
  );
}
