'use client';
import React, { startTransition, useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { APP_DESCRIPTION } from '@/constants';
import { cn } from '@/libs/utils';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  defaultValue?: string;
  disabled?: boolean;
  showButton?: boolean;
  multiline?: boolean;
  className?: string;
  inputClassName?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  placeholder = APP_DESCRIPTION,
  defaultValue = '',
  disabled = false,
  showButton = false,
  multiline = false,
  className,
  inputClassName
}) => {
  const [query, setQuery] = useState(defaultValue);

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
      onSearch(query);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (disabled) return;
      startTransition(() => {
        onSearch(query);
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
            placeholder={placeholder}
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className={cn("pl-9 min-h-[120px] max-h-[260px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-y", inputClassName)}
            disabled={disabled}
          />
        ) : (
          <Input
            type="search"
            placeholder={placeholder}
            value={query}
            onChange={handleInputChange}
            className={cn("pl-9", inputClassName)}
            disabled={disabled}
          />
        )}
      </div>
      {showButton && !multiline && (
        <Button type="submit" disabled={disabled}>
          Search
        </Button>
      )}
    </form>
  );
};

export default SearchBar;
