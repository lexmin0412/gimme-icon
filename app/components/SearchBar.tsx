'use client';
import React, { startTransition, useState, useEffect, useMemo } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Check } from "lucide-react";
import { cn } from '@/libs/utils';
import { useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getIconLibraries } from "@/services/icons";
import { FilterOptions } from "@/types/icon";

interface SearchBarProps {
  onSearch: (query: string, filters?: FilterOptions) => void;
  placeholder?: string;
  defaultValue?: string;
  disabled?: boolean;
  showButton?: boolean;
  multiline?: boolean;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  filters?: FilterOptions;
  hideFilter?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  placeholder,
  defaultValue = '',
  disabled = false,
  showButton = false,
  multiline = false,
  className,
  inputClassName,
  autoFocus,
  filters,
  hideFilter = false
}) => {
  const tLanding = useTranslations('Landing');
  const [query, setQuery] = useState(defaultValue);
  const [libraries, setLibraries] = useState<{prefix: string, name: string, total: number}[]>([]);
  const [selectedLibraries, setSelectedLibraries] = useState<string[]>(filters?.libraries || []);

  const displayPlaceholder = placeholder || tLanding('searchPlaceholder');

  useEffect(() => {
    setQuery(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    if (filters?.libraries) {
      setSelectedLibraries(filters.libraries);
    }
  }, [filters]);

  useEffect(() => {
    getIconLibraries().then((libs) => {
      setLibraries(libs);
    }).catch(err => {
      console.error("Failed to load libraries", err);
    });
  }, []);

  const sortedLibraries = useMemo(() => {
    const selected = libraries.filter(lib => selectedLibraries.includes(lib.prefix));
    const unselected = libraries.filter(lib => !selectedLibraries.includes(lib.prefix));
    return [...selected, ...unselected];
  }, [libraries, selectedLibraries]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    setQuery(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    startTransition(() => {
      onSearch(query, {
        libraries: selectedLibraries,
        categories: [],
        tags: []
      });
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (disabled) return;
      startTransition(() => {
        onSearch(query, {
          libraries: selectedLibraries,
          categories: [],
          tags: []
        });
      });
    }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className={cn("flex w-full max-w-2xl items-center gap-2 mx-auto", className)}
    >
      <div className="relative flex-1">
        <Search className={cn("absolute left-3 h-4 w-4 text-muted-foreground", multiline ? 'top-3' : 'top-1/2 -translate-y-1/2')} />
        {multiline ? (
          <textarea
            placeholder={displayPlaceholder}
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className={cn("pl-9 pr-10 min-h-[120px] max-h-[260px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-y", inputClassName)}
            disabled={disabled}
            autoFocus={autoFocus}
          />
        ) : (
          <Input
            type="search"
            placeholder={displayPlaceholder}
            value={query}
            onChange={handleInputChange}
            className={cn("pl-9 pr-10 [&::-webkit-search-cancel-button]:hidden", inputClassName, hideFilter && "pr-3")}
            disabled={disabled}
            autoFocus={autoFocus}
          />
        )}
        
        {!hideFilter && (
          <div className={cn("absolute right-2", multiline ? "top-3" : "top-1/2 -translate-y-1/2")}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground relative"
                  type="button"
                >
                  <Filter className="h-4 w-4" />
                  {selectedLibraries.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto">
                <DropdownMenuLabel>Filter by Library</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {sortedLibraries.map((lib) => (
                  <DropdownMenuItem
                    key={lib.prefix}
                    onSelect={(e) => {
                      e.preventDefault();
                      setSelectedLibraries(prev => {
                        const isSelected = prev.includes(lib.prefix);
                        return isSelected 
                          ? prev.filter(p => p !== lib.prefix)
                          : [...prev, lib.prefix];
                      });
                    }}
                    className="flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="truncate flex-1">{lib.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {lib.total}
                      </span>
                      {selectedLibraries.includes(lib.prefix) && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
      {showButton && !multiline && (
        <Button type="submit" disabled={disabled}>
          {tLanding("searchButton")}
        </Button>
      )}
    </form>
  );
};

export default SearchBar;
