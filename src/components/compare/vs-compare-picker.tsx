"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import type { CompareSubject } from "~/types/compare";
import { VSSlot } from "./vs-slot";
import { VSSearchModal } from "./vs-search-modal";

type VSComparePickerProps = {
  value: [CompareSubject | null, CompareSubject | null];
  onChange: (next: [CompareSubject | null, CompareSubject | null]) => void;
  className?: string;
};

export function VSComparePicker({ value, onChange, className }: VSComparePickerProps) {
  const [left, right] = value;

  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<"left" | "right" | null>(null);

  // Compute excluded IDs (can't select the same entity twice)
  const excludeIds = useMemo(() => {
    const ids = new Set<string>();
    if (left) ids.add(`${left.type}:${left.id}`);
    if (right) ids.add(`${right.type}:${right.id}`);
    return ids;
  }, [left, right]);

  const handleSlotClick = useCallback((slot: "left" | "right") => {
    setActiveSlot(slot);
    setSearchOpen(true);
  }, []);

  const handleSelect = useCallback(
    (subject: CompareSubject) => {
      if (activeSlot === "left") {
        onChange([subject, right]);
      } else {
        onChange([left, subject]);
      }
      setSearchOpen(false);
      setActiveSlot(null);
    },
    [activeSlot, left, right, onChange]
  );

  const handleClear = useCallback(
    (slot: "left" | "right") => {
      if (slot === "left") {
        onChange([null, right]);
      } else {
        onChange([left, null]);
      }
    },
    [left, right, onChange]
  );

  const handleSwap = useCallback(() => {
    onChange([right, left]);
  }, [left, right, onChange]);

  const handleClose = useCallback(() => {
    setSearchOpen(false);
    setActiveSlot(null);
  }, []);

  const canSwap = !!left && !!right;

  return (
    <div className={cn("space-y-4", className)}>
      {/* VS Layout */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-0 items-stretch">
        {/* Left Slot */}
        <VSSlot
          position="left"
          subject={left}
          onClick={() => handleSlotClick("left")}
          onClear={() => handleClear("left")}
        />

        {/* VS Divider */}
        <div className="flex items-center justify-center md:w-24 md:-mx-4 md:z-10 py-2 md:py-0">
          <div className="relative flex flex-col items-center gap-2">
            {/* VS Badge */}
            <div
              className={cn(
                "flex items-center justify-center",
                "h-14 w-14 rounded-full",
                "bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5",
                "border-2 border-primary/30",
                "shadow-lg shadow-primary/10"
              )}
            >
              <span
                className={cn(
                  "text-xl font-bold tracking-tight",
                  "bg-gradient-to-br from-primary to-primary/70",
                  "bg-clip-text text-transparent"
                )}
              >
                VS
              </span>
            </div>

            {/* Swap Button */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleSwap}
              disabled={!canSwap}
              className={cn(
                "h-8 w-8 rounded-full",
                "bg-background border-border shadow-sm",
                "hover:bg-muted transition-colors",
                "disabled:opacity-30 disabled:cursor-not-allowed"
              )}
              title="Swap left and right"
              aria-label="Swap comparison items"
            >
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Right Slot */}
        <VSSlot
          position="right"
          subject={right}
          onClick={() => handleSlotClick("right")}
          onClear={() => handleClear("right")}
        />
      </div>

      {/* Search Modal */}
      <VSSearchModal
        open={searchOpen}
        onClose={handleClose}
        onSelect={handleSelect}
        excludeIds={excludeIds}
        slotLabel={activeSlot ?? "left"}
      />
    </div>
  );
}
