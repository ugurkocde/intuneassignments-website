"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDebouncedCallback } from "use-debounce";
import { useMsal } from "@azure/msal-react";
import { Search, X, Loader2, User, Monitor, Users } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { loginRequest } from "~/config/authConfig";
import { searchAll, searchGroups } from "~/services/graph";
import type { CompareSearchResult, CompareSubject } from "~/types/compare";

type VSSearchModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (subject: CompareSubject) => void;
  excludeIds: Set<string>;
  slotLabel: "left" | "right";
};

const toSubject = (r: CompareSearchResult): CompareSubject => {
  if (r.type === "user") {
    const u = r.data;
    return {
      type: "user",
      id: u.id,
      label: u.displayName,
      subtitle: u.mail ?? u.userPrincipalName,
    };
  }
  if (r.type === "device") {
    const d = r.data;
    return {
      type: "device",
      id: d.id,
      label: d.displayName,
      subtitle: d.serialNumber
        ? `${d.operatingSystem ?? "Unknown OS"} | SN: ${d.serialNumber}`
        : d.operatingSystem ?? "Device",
    };
  }
  const g = r.data;
  return {
    type: "group",
    id: g.id,
    label: g.displayName,
    subtitle: g.description ?? "Group",
  };
};

const getResultInfo = (r: CompareSearchResult) => {
  switch (r.type) {
    case "user":
      return {
        icon: <User className="h-5 w-5 text-primary" />,
        iconBg: "bg-primary/10",
        badge: "User",
        badgeColor: "bg-primary/10 text-primary",
      };
    case "device":
      return {
        icon: <Monitor className="h-5 w-5 text-blue-600" />,
        iconBg: "bg-blue-500/10",
        badge: "Device",
        badgeColor: "bg-blue-500/10 text-blue-600",
      };
    case "group":
      return {
        icon: <Users className="h-5 w-5 text-purple-600" />,
        iconBg: "bg-purple-500/10",
        badge: "Group",
        badgeColor: "bg-purple-500/10 text-purple-600",
      };
  }
};

export function VSSearchModal({
  open,
  onClose,
  onSelect,
  excludeIds,
  slotLabel,
}: VSSearchModalProps) {
  const { instance, accounts } = useMsal();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CompareSearchResult[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  const getAccessToken = useCallback(async () => {
    const account = accounts[0];
    if (!account) throw new Error("No active account");
    const response = await instance.acquireTokenSilent({
      ...loginRequest,
      account,
    });
    return response.accessToken;
  }, [accounts, instance]);

  // Filter results to exclude already-selected items
  const filteredResults = results.filter(
    (r) => !excludeIds.has(`${r.type}:${r.data.id}`)
  );

  const doSearch = useCallback(
    async (searchQuery: string) => {
      const token = await getAccessToken();
      const [principalResults, groupResults] = await Promise.all([
        searchAll(token, searchQuery),
        searchGroups(token, searchQuery),
      ]);
      const mapped: CompareSearchResult[] = [
        ...(principalResults as any),
        ...groupResults.map((g) => ({ type: "group" as const, data: g })),
      ];
      return mapped;
    },
    [getAccessToken]
  );

  const debouncedSearch = useDebouncedCallback((searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    void doSearch(searchQuery.trim())
      .then((items) => {
        setResults(items);
        setHighlightedIndex(0);
      })
      .finally(() => {
        setIsSearching(false);
      });
  }, 250);

  const handleSelect = useCallback(
    (item: CompareSearchResult) => {
      onSelect(toSubject(item));
    },
    [onSelect]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (filteredResults.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % filteredResults.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(
          (prev) => (prev - 1 + filteredResults.length) % filteredResults.length
        );
        break;
      case "Enter":
        e.preventDefault();
        if (filteredResults[highlightedIndex]) {
          handleSelect(filteredResults[highlightedIndex]);
        }
        break;
    }
  };

  // Portal target
  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  // Sync visibility for animations
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setIsVisible(true));
      // Focus input after opening
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setIsVisible(false);
    }
  }, [open]);

  // Reset state when closing
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setQuery("");
        setResults([]);
        setHighlightedIndex(0);
        setIsSearching(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on backdrop click
  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open, onClose]);

  // Focus trap
  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusableElements = container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleTabKey);
    return () => document.removeEventListener("keydown", handleTabKey);
  }, [open]);

  // Scroll highlighted into view
  useEffect(() => {
    if (filteredResults.length === 0) return;
    const container = resultsContainerRef.current;
    if (!container) return;

    const highlightedElement = container.querySelector(
      `[data-result-index="${highlightedIndex}"]`
    );
    if (highlightedElement) {
      highlightedElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [highlightedIndex, filteredResults.length]);

  if (!open || !portalTarget) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-start justify-center px-4 pt-20 sm:pt-28">
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200",
          isVisible ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Modal */}
      <div
        ref={containerRef}
        className={cn(
          "relative w-full max-w-lg rounded-xl border border-border bg-background/95 shadow-2xl backdrop-blur-md",
          "transition-all duration-200 origin-top",
          isVisible
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 -translate-y-2"
        )}
        role="dialog"
        aria-modal="true"
        aria-label={`Select item for ${slotLabel} slot`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                const v = e.target.value;
                setQuery(v);
                if (v.trim().length >= 2) {
                  setIsSearching(true);
                } else {
                  setIsSearching(false);
                }
                debouncedSearch(v);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search users, devices, or groups..."
              className="pl-9 pr-10 h-12 text-base bg-background/50"
              role="combobox"
              aria-controls="vs-search-results"
              aria-activedescendant={
                filteredResults.length > 0
                  ? `vs-search-result-${highlightedIndex}`
                  : undefined
              }
              aria-expanded={filteredResults.length > 0}
              aria-autocomplete="list"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResults([]);
                  setHighlightedIndex(0);
                  setIsSearching(false);
                  inputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 hover:bg-muted/50 cursor-pointer"
                aria-label="Clear query"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <Button type="button" variant="ghost" onClick={onClose} className="cursor-pointer">
            Esc
          </Button>
        </div>

        {/* Slot indicator */}
        <div className="px-4 py-2 bg-muted/30 border-b border-border">
          <p className="text-xs text-muted-foreground">
            Selecting for <span className="font-medium text-foreground capitalize">{slotLabel}</span> slot
          </p>
        </div>

        {/* Screen reader live region */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {isSearching
            ? "Searching..."
            : filteredResults.length > 0
              ? `${filteredResults.length} result${filteredResults.length === 1 ? "" : "s"} found`
              : query.trim().length >= 2
                ? "No results found"
                : ""}
        </div>

        {/* Results */}
        <div
          ref={resultsContainerRef}
          id="vs-search-results"
          role="listbox"
          aria-label="Search results"
          className="max-h-[360px] overflow-y-auto"
        >
          {isSearching ? (
            <div className="p-6 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Searching...</span>
            </div>
          ) : query.trim().length >= 2 && filteredResults.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No results for &quot;{query}&quot;
            </div>
          ) : filteredResults.length > 0 ? (
            <div className="py-2">
              <div className="px-4 pb-2 text-xs text-muted-foreground">
                {filteredResults.length} result{filteredResults.length === 1 ? "" : "s"}
              </div>
              {filteredResults.map((result, idx) => {
                const info = getResultInfo(result);
                const subj = toSubject(result);
                return (
                  <button
                    key={`${result.type}-${result.data.id}`}
                    id={`vs-search-result-${idx}`}
                    data-result-index={idx}
                    type="button"
                    role="option"
                    aria-selected={idx === highlightedIndex}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer",
                      idx === highlightedIndex
                        ? "bg-primary/10 ring-1 ring-primary/20"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center h-10 w-10 rounded-full",
                        info.iconBg
                      )}
                    >
                      {info.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">
                          {subj.label}
                        </span>
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full",
                            info.badgeColor
                          )}
                        >
                          {info.badge}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {subj.subtitle ?? subj.id}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search.
            </div>
          )}
        </div>
      </div>
    </div>,
    portalTarget
  );
}
