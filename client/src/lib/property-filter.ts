import { FilterCondition, PropertyFilters, SortDirection } from './property-filter-types';

/**
 * Retrieves a property value by path, supporting both simple and nested paths
 */
export function getValueByPath(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  
  // Handle nested paths with dot notation
  if (path.includes('.')) {
    const parts = path.split('.');
    let value = obj;
    
    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = value[part];
    }
    
    return value;
  }
  
  // Handle simple paths
  return obj[path];
}

/**
 * Converts camelCase field names to Title Case for display
 */
export function formatFilterFieldName(fieldName: string): string {
  // If it's a nested path, get the last part
  const lastPart = fieldName.includes('.') ? fieldName.split('.').pop()! : fieldName;
  
  // Convert camelCase to Title Case
  return lastPart
    // Insert a space before all uppercase letters
    .replace(/([A-Z])/g, ' $1')
    // Capitalize the first letter
    .replace(/^./, (str) => str.toUpperCase())
    // Remove leading spaces
    .trim();
}

/**
 * Determines if a value matches string filter conditions
 */
function matchesStringFilter(value: string, filter: FilterCondition): boolean {
  if (!value) return false;
  const stringValue = String(value).toLowerCase();
  
  // String comparison
  if ('equals' in filter && filter.equals !== undefined) {
    return stringValue === String(filter.equals).toLowerCase();
  }
  
  if ('contains' in filter && filter.contains !== undefined) {
    return stringValue.includes(String(filter.contains).toLowerCase());
  }
  
  if ('startsWith' in filter && filter.startsWith !== undefined) {
    return stringValue.startsWith(String(filter.startsWith).toLowerCase());
  }
  
  if ('endsWith' in filter && filter.endsWith !== undefined) {
    return stringValue.endsWith(String(filter.endsWith).toLowerCase());
  }
  
  return true;
}

/**
 * Determines if a value matches numeric filter conditions
 */
function matchesNumericFilter(value: number, filter: FilterCondition): boolean {
  if (value === null || value === undefined) return false;
  const numValue = Number(value);
  
  // Numeric comparison
  if ('equals' in filter && filter.equals !== undefined) {
    return numValue === filter.equals;
  }
  
  if ('min' in filter && filter.min !== undefined) {
    if (numValue < filter.min) return false;
  }
  
  if ('max' in filter && filter.max !== undefined) {
    if (numValue > filter.max) return false;
  }
  
  if ('lessThan' in filter && filter.lessThan !== undefined) {
    if (numValue >= filter.lessThan) return false;
  }
  
  if ('greaterThan' in filter && filter.greaterThan !== undefined) {
    if (numValue <= filter.greaterThan) return false;
  }
  
  return true;
}

/**
 * Determines if a value matches boolean filter conditions
 */
function matchesBooleanFilter(value: boolean, filter: FilterCondition): boolean {
  if (value === null || value === undefined) return false;
  
  // Boolean comparison
  if ('equals' in filter && filter.equals !== undefined) {
    return Boolean(value) === filter.equals;
  }
  
  return true;
}

/**
 * Determines if a date value matches date filter conditions
 */
function matchesDateFilter(value: string | Date, filter: FilterCondition): boolean {
  if (!value) return false;
  
  const dateValue = value instanceof Date ? value : new Date(value);
  if (isNaN(dateValue.getTime())) return false;
  
  // Date comparison
  if ('equals' in filter && filter.equals !== undefined) {
    // Handle the case where equals could be a date string
    if (typeof filter.equals === 'string' || typeof filter.equals === 'number') {
      const compareDate = new Date(filter.equals);
      return dateValue.toDateString() === compareDate.toDateString();
    }
  }
  
  if ('after' in filter && filter.after !== undefined) {
    const compareDate = new Date(filter.after);
    if (dateValue <= compareDate) return false;
  }
  
  if ('before' in filter && filter.before !== undefined) {
    const compareDate = new Date(filter.before);
    if (dateValue >= compareDate) return false;
  }
  
  return true;
}

/**
 * Determines if a property matches a set of filter conditions
 */
function matchesFilter(property: any, fieldName: string, filter: FilterCondition): boolean {
  const value = getValueByPath(property, fieldName);
  
  if (value === undefined) return false;
  
  const type = typeof value;
  
  if (type === 'string') {
    return matchesStringFilter(value, filter);
  } else if (type === 'number') {
    return matchesNumericFilter(value, filter);
  } else if (type === 'boolean') {
    return matchesBooleanFilter(value, filter);
  } else if (value instanceof Date || (type === 'string' && !isNaN(Date.parse(value as string)))) {
    return matchesDateFilter(value, filter);
  }
  
  return false;
}

/**
 * Filters an array of properties based on the provided filters
 */
export function filterProperties<T extends object>(properties: T[], filters: PropertyFilters): T[] {
  if (!filters || Object.keys(filters).length === 0) {
    return properties;
  }
  
  return properties.filter(property => {
    // Apply all filters (AND logic)
    for (const [fieldName, filter] of Object.entries(filters)) {
      if (!matchesFilter(property, fieldName, filter)) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Sorts an array of properties by the specified field and direction
 */
export function sortProperties<T extends object>(
  properties: T[],
  sortField: string,
  direction: SortDirection = 'asc'
): T[] {
  if (!sortField) return properties;
  
  return [...properties].sort((a, b) => {
    const valueA = getValueByPath(a, sortField) ?? '';
    const valueB = getValueByPath(b, sortField) ?? '';
    
    // Handle string comparison
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return direction === 'asc'
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    }
    
    // Handle numeric comparison
    const numA = Number(valueA);
    const numB = Number(valueB);
    
    if (!isNaN(numA) && !isNaN(numB)) {
      return direction === 'asc' ? numA - numB : numB - numA;
    }
    
    // Fallback comparison
    if (valueA < valueB) return direction === 'asc' ? -1 : 1;
    if (valueA > valueB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}