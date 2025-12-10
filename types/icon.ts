export interface Icon {
  id: string;
  name: string;
  svg: string;
  library: string;
  category: string;
  tags: string[];
  synonyms: string[];
}

export interface SearchResult {
  icon: Icon;
  score: number;
}

export interface FilterOptions {
  libraries: string[];
  categories: string[];
  tags: string[];
}

export interface SearchParams {
  query: string;
  filters: FilterOptions;
  limit: number;
}
