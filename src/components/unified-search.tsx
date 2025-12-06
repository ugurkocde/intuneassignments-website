"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Search, X, Loader2, User, Monitor } from "lucide-react";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import type { SearchResult, GraphUser, GraphDevice } from "~/types/user";

interface UnifiedSearchProps {
  onSearch: (query: string) => Promise<SearchResult[]>;
  onSelect: (result: SearchResult) => void;
  selectedItem: SearchResult | null;
  onClear: () => void;
  isSearching?: boolean;
  className?: string;
}

export function UnifiedSearch({
  onSearch,
  onSelect,
  selectedItem,
  onClear,
  isSearching = false,
  className
}: UnifiedSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebouncedCallback((searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }
    void onSearch(searchQuery).then(searchResults => {
      setResults(searchResults);
      setHighlightedIndex(0);
    });
  }, 300);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true);
    debouncedSearch(value);
  };

  const handleSelect = useCallback((result: SearchResult) => {
    onSelect(result);
    setQuery("");
    setResults([]);
    setIsOpen(false);
  }, [onSelect]);

  const handleClear = useCallback(() => {
    onClear();
    setQuery("");
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  }, [onClear]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % results.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(prev => (prev - 1 + results.length) % results.length);
        break;
      case "Enter":
        e.preventDefault();
        if (results[highlightedIndex]) {
          handleSelect(results[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helper to get display info based on result type
  const getResultInfo = (result: SearchResult) => {
    if (result.type === "user") {
      const user = result.data as GraphUser;
      return {
        icon: <User className="h-5 w-5 text-primary" />,
        iconBg: "bg-primary/10",
        name: user.displayName,
        subtitle: user.mail ?? user.userPrincipalName,
        badge: "User",
        badgeColor: "bg-primary/10 text-primary"
      };
    } else {
      const device = result.data as GraphDevice;
      return {
        icon: <Monitor className="h-5 w-5 text-blue-600" />,
        iconBg: "bg-blue-500/10",
        name: device.displayName,
        subtitle: device.serialNumber
          ? `${device.operatingSystem ?? "Unknown OS"} | SN: ${device.serialNumber}`
          : device.operatingSystem ?? "Unknown OS",
        badge: "Device",
        badgeColor: "bg-blue-500/10 text-blue-600"
      };
    }
  };

  // If an item is selected, show the selected state
  if (selectedItem) {
    const info = getResultInfo(selectedItem);
    return (
      <div className={cn("relative", className)} ref={containerRef}>
        <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-lg">
          <div className={cn("flex items-center justify-center h-10 w-10 rounded-full", info.iconBg)}>
            {info.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground truncate">
                {info.name}
              </span>
              <span className={cn("text-xs px-2 py-0.5 rounded-full", info.badgeColor)}>
                {info.badge}
              </span>
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {info.subtitle}
            </div>
          </div>
          <button
            onClick={handleClear}
            className="p-2 hover:bg-primary/10 rounded-md transition-colors"
            aria-label="Clear selection"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search for a user or device..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          className="pl-10 pr-10 h-12 text-base"
          aria-label="Search users and devices"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          role="combobox"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && results.length > 0 && (
        <div
          className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-900 border border-border rounded-lg shadow-lg overflow-hidden max-h-[400px] overflow-y-auto"
          role="listbox"
        >
          {results.map((result, index) => {
            const info = getResultInfo(result);
            return (
              <button
                key={`${result.type}-${result.data.id}`}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer",
                  index === highlightedIndex
                    ? "bg-primary/5"
                    : "hover:bg-muted/50"
                )}
                role="option"
                aria-selected={index === highlightedIndex}
              >
                <div className={cn("flex items-center justify-center h-10 w-10 rounded-full", info.iconBg)}>
                  {info.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground truncate">
                      {info.name}
                    </span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", info.badgeColor)}>
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
      )}

      {/* No results message */}
      {isOpen && query.length >= 2 && !isSearching && results.length === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-900 border border-border rounded-lg shadow-lg p-4 text-center text-muted-foreground">
          No users or devices found matching &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}
