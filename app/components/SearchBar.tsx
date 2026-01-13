'use client';
import React, { startTransition, useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  defaultValue?: string;
  disabled?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  placeholder = 'Search icons...',
  defaultValue = '',
  disabled = false
}) => {
  const [query, setQuery] = useState(defaultValue);

  // 如果 defaultValue 发生变化，更新 query（可选，取决于是否需要响应外部变化）
  // 在当前场景下，主要是为了初始化
  // useEffect(() => {
  //   setQuery(defaultValue);
  // }, [defaultValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    startTransition(()=>{
      onSearch(query);
    })
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className="flex w-full max-w-2xl items-center gap-2 mx-auto"
    >
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          className="pl-9"
          disabled={disabled}
        />
      </div>
      <Button type="submit" disabled={disabled}>Search</Button>
    </form>
  );
};

export default SearchBar;