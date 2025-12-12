"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDebouncedCallback } from "use-debounce";
import { useRouter } from "next/navigation";
import { useMsal } from "@azure/msal-react";
import { Search, X, Loader2, User, Monitor, Users } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { loginRequest } from "~/config/authConfig";
import type { GraphDevice, GraphGroup, GraphUser } from "~/types/user";
import { searchAll, searchGroups } from "~/services/graph";

type SpotlightResult =
  | { type: "user"; data: GraphUser }
  | { type: "device"; data: GraphDevice }
  | { type: "group"; data: GraphGroup };

const isTextField = (el: EventTarget | null) => {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    el.isContentEditable
  );
};

const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return prefersReducedMotion;
};

export function SpotlightSearch({
  className,
}: {
  className?: string;
}) {
  const router = useRouter();
  const { instance, accounts } = useMsal();
  const prefersReducedMotion = usePrefersReducedMotion();

  const [open, setOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotlightResult[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
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

  const close = useCallback(() => {
    if (prefersReducedMotion) {
      setOpen(false);
      setIsVisible(false);
      setQuery("");
      setResults([]);
      setHighlightedIndex(0);
      triggerRef.current?.focus();
    } else {
      setIsVisible(false);
      setTimeout(() => {
        setOpen(false);
        setQuery("");
        setResults([]);
        setHighlightedIndex(0);
        triggerRef.current?.focus();
      }, 200);
    }
  }, [prefersReducedMotion]);

  const openAndFocus = useCallback(() => {
    setOpen(true);
    // focus after render
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  // Render overlay outside of header stacking contexts
  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  // Sync visibility state for animations
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setIsVisible(true));
    }
  }, [open]);

  // Global keyboard shortcut Cmd/Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === "k";
      if ((e.metaKey || e.ctrlKey) && isK) {
        if (isTextField(e.target)) return;
        e.preventDefault();
        setOpen((prev) => {
          const next = !prev;
          if (next) {
            setTimeout(() => inputRef.current?.focus(), 0);
          }
          return next;
        });
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [close, open]);

  // Lock background scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close when clicking backdrop (outside container)
  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        close();
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [close, open]);

  // Focus trap - keep Tab within modal
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

  // Scroll highlighted result into view
  useEffect(() => {
    if (results.length === 0) return;

    const container = resultsContainerRef.current;
    if (!container) return;

    const highlightedElement = container.querySelector(
      `[data-result-index="${highlightedIndex}"]`
    );

    if (highlightedElement) {
      highlightedElement.scrollIntoView({
        block: "nearest",
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    }
  }, [highlightedIndex, results.length, prefersReducedMotion]);

  const doSearch = useCallback(
    async (searchQuery: string) => {
      const token = await getAccessToken();

      const [principalResults, groupResults] = await Promise.all([
        searchAll(token, searchQuery),
        searchGroups(token, searchQuery),
      ]);

      const mapped: SpotlightResult[] = [
        ...(principalResults as any),
        ...groupResults.map((g) => ({ type: "group" as const, data: g })),
      ];

      return mapped;
    },
    [getAccessToken],
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

  const resultLabel = useMemo(() => {
    if (results.length === 0) return "";
    return `${results.length} result${results.length === 1 ? "" : "s"}`;
  }, [results.length]);

  const handleSelect = useCallback(
    (item: SpotlightResult) => {
      close();
      router.push(`/assignments/${item.type}/${item.data.id}`);
    },
    [close, router],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % results.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(
          (prev) => (prev - 1 + results.length) % results.length,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (results[highlightedIndex]) handleSelect(results[highlightedIndex]);
        break;
    }
  };

  const getResultInfo = (result: SpotlightResult) => {
    switch (result.type) {
      case "user": {
        const user = result.data as GraphUser;
        return {
          icon: <User className="h-5 w-5 text-primary" />,
          iconBg: "bg-primary/10",
          title: user.displayName,
          subtitle: user.mail ?? user.userPrincipalName,
          badge: "User",
          badgeColor: "bg-primary/10 text-primary",
        };
      }
      case "device": {
        const device = result.data as GraphDevice;
        return {
          icon: <Monitor className="h-5 w-5 text-blue-600" />,
          iconBg: "bg-blue-500/10",
          title: device.displayName,
          subtitle: device.serialNumber
            ? `${device.operatingSystem ?? "Unknown OS"} | SN: ${device.serialNumber}`
            : device.operatingSystem ?? "Unknown OS",
          badge: "Device",
          badgeColor: "bg-blue-500/10 text-blue-600",
        };
      }
      case "group": {
        const group = result.data as GraphGroup;
        return {
          icon: <Users className="h-5 w-5 text-purple-600" />,
          iconBg: "bg-purple-500/10",
          title: group.displayName,
          subtitle: group.description ?? "Group",
          badge: "Group",
          badgeColor: "bg-purple-500/10 text-purple-600",
        };
      }
    }
  };

  return (
    <div className={cn("flex items-center", className)}>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        size="sm"
        onClick={openAndFocus}
        className="gap-2 cursor-pointer"
        aria-label="Open search"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search</span>
        <span className="hidden sm:inline text-xs text-muted-foreground">
          ⌘/Ctrl K
        </span>
      </Button>

      {open &&
        portalTarget &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-start justify-center px-4 pt-24 sm:pt-28">
            {/* Backdrop */}
            <div
              className={cn(
                "absolute inset-0 bg-black/50 backdrop-blur-sm",
                !prefersReducedMotion && "transition-opacity duration-200",
                isVisible ? "opacity-100" : "opacity-0"
              )}
            />

            {/* Modal */}
            <div
              ref={containerRef}
              className={cn(
                "relative w-full max-w-2xl rounded-xl border border-border bg-background/95 shadow-2xl backdrop-blur-md",
                !prefersReducedMotion && "transition-all duration-200 origin-top",
                isVisible
                  ? "opacity-100 scale-100 translate-y-0"
                  : "opacity-0 scale-95 -translate-y-2"
              )}
              role="dialog"
              aria-modal="true"
              aria-label="Search"
            >
            <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => {
                    const v = e.target.value;
                    setQuery(v);
                    // Show loading indicator immediately if query is long enough
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
                  aria-controls="spotlight-results"
                  aria-activedescendant={
                    results.length > 0 ? `spotlight-result-${highlightedIndex}` : undefined
                  }
                  aria-expanded={results.length > 0}
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
              <Button type="button" variant="ghost" onClick={close} className="cursor-pointer">
                Esc
              </Button>
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
                : results.length > 0
                  ? `${results.length} result${results.length === 1 ? "" : "s"} found`
                  : query.trim().length >= 2
                    ? "No results found"
                    : ""}
            </div>

            <div
              ref={resultsContainerRef}
              id="spotlight-results"
              role="listbox"
              aria-label="Search results"
              className="max-h-[420px] overflow-y-auto"
            >
              {isSearching ? (
                <div className="p-6 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Searching...</span>
                </div>
              ) : query.trim().length >= 2 && results.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No results for &quot;{query}&quot;
                </div>
              ) : results.length > 0 ? (
                <div className="py-2">
                  <div className="px-4 pb-2 text-xs text-muted-foreground">
                    {resultLabel}
                  </div>
                  {results.map((result, idx) => {
                    const info = getResultInfo(result);
                    return (
                      <button
                        key={`${result.type}-${result.data.id}`}
                        id={`spotlight-result-${idx}`}
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
                            : "hover:bg-muted/50",
                        )}
                      >
                        <div
                          className={cn(
                            "flex items-center justify-center h-10 w-10 rounded-full",
                            info.iconBg,
                          )}
                        >
                          {info.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground truncate">
                              {info.title}
                            </span>
                            <span
                              className={cn(
                                "text-xs px-2 py-0.5 rounded-full",
                                info.badgeColor,
                              )}
                            >
                              {info.badge}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {info.subtitle}
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
          portalTarget,
        )}
    </div>
  );
}

