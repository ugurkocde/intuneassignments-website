"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Search, X, Loader2, User } from "lucide-react";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import type { GraphUser } from "~/types/user";

interface UserSearchProps {
  onSearch: (query: string) => Promise<GraphUser[]>;
  onSelect: (user: GraphUser) => void;
  selectedUser: GraphUser | null;
  onClear: () => void;
  isSearching?: boolean;
  className?: string;
}

export function UserSearch({
  onSearch,
  onSelect,
  selectedUser,
  onClear,
  isSearching = false,
  className
}: UserSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GraphUser[]>([]);
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

  const handleSelect = useCallback((user: GraphUser) => {
    onSelect(user);
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

  // If a user is selected, show the selected state
  if (selectedUser) {
    return (
      <div className={cn("relative", className)} ref={containerRef}>
        <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground truncate">
              {selectedUser.displayName}
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {selectedUser.mail ?? selectedUser.userPrincipalName}
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
          placeholder="Search for a user by name or email..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          className="pl-10 pr-10 h-12 text-base"
          aria-label="Search users"
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
          className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-900 border border-border rounded-lg shadow-lg overflow-hidden"
          role="listbox"
        >
          {results.map((user, index) => (
            <button
              key={user.id}
              onClick={() => handleSelect(user)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                index === highlightedIndex
                  ? "bg-primary/5"
                  : "hover:bg-muted/50"
              )}
              role="option"
              aria-selected={index === highlightedIndex}
            >
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">
                  {user.displayName}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {user.mail ?? user.userPrincipalName}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && query.length >= 2 && !isSearching && results.length === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-900 border border-border rounded-lg shadow-lg p-4 text-center text-muted-foreground">
          No users found matching &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}
