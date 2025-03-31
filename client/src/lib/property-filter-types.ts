// Type definitions for property filtering and sorting

// String filter conditions
export interface StringFilter {
  equals?: string;
  contains?: string;
  startsWith?: string;
  endsWith?: string;
}

// Numeric filter conditions
export interface NumericFilter {
  equals?: number;
  min?: number;
  max?: number;
  lessThan?: number;
  greaterThan?: number;
}

// Boolean filter condition
export interface BooleanFilter {
  equals: boolean;
}

// Date filter conditions
export interface DateFilter {
  equals?: string; // ISO date string
  after?: string; // ISO date string
  before?: string; // ISO date string
}

// Union type of all possible filter types
export type FilterCondition = StringFilter | NumericFilter | BooleanFilter | DateFilter;

// Type for the entire filter object
export type PropertyFilters = Record<string, FilterCondition>;

// Sort direction type
export type SortDirection = 'asc' | 'desc';