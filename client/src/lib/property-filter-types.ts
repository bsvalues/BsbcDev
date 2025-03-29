// Type definitions for property filter utilities

// Filter operator types
export type FilterOperatorContains = { contains: string };
export type FilterOperatorEquals = { equals: string | number | boolean };
export type FilterOperatorRange = { min?: number; max?: number };

export type FilterOperator = FilterOperatorContains | FilterOperatorEquals | FilterOperatorRange;

export type PropertyFilters = {
  [key: string]: FilterOperator;
};

export type SortDirection = 'asc' | 'desc';