'use client';
import React, { startTransition, useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { APP_DESCRIPTION } from '@/constants';
import { cn } from '@/libs/utils';
import { useTranslations } from 'next-intl';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  defaultValue?: string;
  disabled?: boolean;
  showButton?: boolean;
  multiline?: boolean;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
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
  autoFocus
}) => {
  const tLanding = useTranslations('Landing');
  const [query, setQuery] = useState(defaultValue);

  const displayPlaceholder = placeholder || tLanding('searchPlaceholder');

  useEffect(() => {
    setQuery(defaultValue);
  }, [defaultValue]);

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
            placeholder={displayPlaceholder}
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className={cn("pl-9 min-h-[120px] max-h-[260px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-y", inputClassName)}
            disabled={disabled}
            autoFocus={autoFocus}
          />
        ) : (
          <Input
            type="search"
            placeholder={displayPlaceholder}
            value={query}
            onChange={handleInputChange}
            className={cn("pl-9", inputClassName)}
            disabled={disabled}
            autoFocus={autoFocus}
          />
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
