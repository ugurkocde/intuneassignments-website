"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { useMsal } from "@azure/msal-react";
import { X, Loader2, User, Monitor, Users, Search } from "lucide-react";
import { loginRequest } from "~/config/authConfig";
import { searchAll, searchGroups } from "~/services/graph";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { CompareSearchResult, CompareSubject } from "~/types/compare";

export function ComparePicker({
  value,
  onChange,
  className,
}: {
  value: CompareSubject[];
  onChange: (next: CompareSubject[]) => void;
  className?: string;
}) {
  const { instance, accounts } = useMsal();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CompareSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getAccessToken = useCallback(async () => {
    const account = accounts[0];
    if (!account) throw new Error("No active account");
    const response = await instance.acquireTokenSilent({
      ...loginRequest,
      account,
    });
    return response.accessToken;
  }, [accounts, instance]);

  const subjectIds = useMemo(() => new Set(value.map((v) => `${v.type}:${v.id}`)), [value]);

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
          icon: <User className="h-4 w-4 text-primary" />,
          iconBg: "bg-primary/10",
          badge: "User",
          badgeColor: "bg-primary/10 text-primary",
        };
      case "device":
        return {
          icon: <Monitor className="h-4 w-4 text-blue-600" />,
          iconBg: "bg-blue-500/10",
          badge: "Device",
          badgeColor: "bg-blue-500/10 text-blue-600",
        };
      case "group":
        return {
          icon: <Users className="h-4 w-4 text-purple-600" />,
          iconBg: "bg-purple-500/10",
          badge: "Group",
          badgeColor: "bg-purple-500/10 text-purple-600",
        };
    }
  };

  const doSearch = useCallback(
    async (q: string) => {
      const token = await getAccessToken();
      const [principal, groups] = await Promise.all([
        searchAll(token, q),
        searchGroups(token, q),
      ]);
      const mapped: CompareSearchResult[] = [
        ...(principal as any),
        ...groups.map((g) => ({ type: "group" as const, data: g })),
      ];
      return mapped.filter((r) => !subjectIds.has(`${r.type}:${r.data.id}`));
    },
    [getAccessToken, subjectIds],
  );

  const debouncedSearch = useDebouncedCallback((q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    void doSearch(trimmed)
      .then((items) => {
        setResults(items);
        setHighlightedIndex(0);
      })
      .finally(() => setIsSearching(false));
  }, 250);

  const addSubject = useCallback(
    (s: CompareSubject) => {
      onChange([...value, s]);
      setQuery("");
      setResults([]);
      setOpen(false);
      inputRef.current?.focus();
    },
    [onChange, value],
  );

  const removeSubject = useCallback(
    (idx: number) => {
      const next = value.slice();
      next.splice(idx, 1);
      onChange(next);
    },
    [onChange, value],
  );

  const clearAll = useCallback(() => {
    onChange([]);
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % results.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + results.length) % results.length);
        break;
      case "Enter":
        e.preventDefault();
        if (results[highlightedIndex]) addSubject(toSubject(results[highlightedIndex]));
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className={cn("space-y-3", className)} ref={containerRef}>
      {/* Selected subjects */}
      <div className="flex flex-wrap gap-2">
        {value.map((s, idx) => (
          <div
            key={`${s.type}:${s.id}`}
            className="flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1.5 text-sm"
            title={s.subtitle ?? s.id}
          >
            <span className="font-medium">{s.label}</span>
            <span className="text-xs text-muted-foreground">{s.type}</span>
            <button
              type="button"
              className="rounded-full p-1 hover:bg-muted/50"
              aria-label={`Remove ${s.label}`}
              onClick={() => removeSubject(idx)}
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        ))}

        {value.length > 0 && (
          <Button type="button" variant="outline" size="sm" onClick={clearAll} className="h-8">
            Clear
          </Button>
        )}
      </div>

      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            setOpen(true);
            debouncedSearch(v);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Add user, device, or group…"
          className="pl-9 pr-10 h-12 bg-background/50"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Dropdown */}
      {open && query.trim().length >= 2 && (
        <div
          className="rounded-lg border border-border bg-background shadow-lg overflow-hidden"
          role="listbox"
        >
          {isSearching ? (
            <div className="p-4 text-sm text-muted-foreground">Searching…</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No results.</div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto">
              {results.map((r, idx) => {
                const info = getResultInfo(r);
                const subj = toSubject(r);
                const active = idx === highlightedIndex;
                return (
                  <button
                    key={`${r.type}:${r.data.id}`}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => addSubject(subj)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                      active ? "bg-primary/5" : "hover:bg-muted/50",
                    )}
                  >
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-full", info.iconBg)}>
                      {info.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{subj.label}</span>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full", info.badgeColor)}>
                          {info.badge}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">{subj.subtitle ?? subj.id}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


