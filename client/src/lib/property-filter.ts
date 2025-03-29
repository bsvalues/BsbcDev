import { Property } from '@shared/schema';
import { 
  FilterOperator, 
  FilterOperatorContains,
  FilterOperatorEquals,
  FilterOperatorRange,
  PropertyFilters, 
  SortDirection 
} from './property-filter-types';

/**
 * Get value from an object by path (supports nested properties)
 * @param obj Object to get value from
 * @param path Path to the property (e.g., 'propertyDetails.marketValue')
 * @returns The value at the specified path
 */
export function getValueByPath(obj: any, path: string): any {
  return path.split('.').reduce((prev, curr) => {
    return prev && prev[curr] !== undefined ? prev[curr] : undefined;
  }, obj);
}

/**
 * Filter properties based on specified filter criteria
 * @param properties Array of properties to filter
 * @param filters Object containing filter criteria
 * @returns Filtered properties array
 */
export function filterProperties(
  properties: Property[],
  filters: PropertyFilters
): Property[] {
  // If no filters, return all properties
  if (Object.keys(filters).length === 0) {
    return [...properties];
  }

  return properties.filter(property => {
    // Check each filter criteria
    return Object.entries(filters).every(([key, operator]) => {
      const value = getValueByPath(property, key);
      
      // Skip if property doesn't exist
      if (value === undefined) {
        return false;
      }

      // Text contains filter
      if ('contains' in operator && typeof operator.contains === 'string') {
        if (typeof value === 'string') {
          return value.toLowerCase().includes(operator.contains.toLowerCase());
        } 
        // Handle array contains (for amenities, etc.)
        else if (Array.isArray(value)) {
          return value.some(item => {
            if (typeof item === 'string') {
              return item.toLowerCase().includes(operator.contains.toLowerCase());
            }
            return false;
          });
        }
        return false;
      } 
      
      // Exact match filter
      else if ('equals' in operator) {
        return value === operator.equals;
      } 
      
      // Numeric range filter
      else if ('min' in operator || 'max' in operator) {
        const numValue = typeof value === 'number' ? value : parseFloat(value);
        if (isNaN(numValue)) return false;
        
        const min = operator.min !== undefined ? operator.min : Number.MIN_SAFE_INTEGER;
        const max = operator.max !== undefined ? operator.max : Number.MAX_SAFE_INTEGER;
        
        return numValue >= min && numValue <= max;
      }
      
      return true;
    });
  });
}

/**
 * Sort properties by a specified field and direction
 * @param properties Array of properties to sort
 * @param sortField Field to sort by (supports nested properties)
 * @param direction Sort direction ('asc' or 'desc')
 * @returns Sorted properties array
 */
export function sortProperties(
  properties: Property[],
  sortField: string,
  direction: SortDirection
): Property[] {
  const sortedProperties = [...properties].sort((a, b) => {
    const aValue = getValueByPath(a, sortField);
    const bValue = getValueByPath(b, sortField);
    
    // Handle undefined values
    if (aValue === undefined && bValue === undefined) return 0;
    if (aValue === undefined) return -1;
    if (bValue === undefined) return 1;
    
    // Sort based on value type
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return aValue.localeCompare(bValue);
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      return aValue - bValue;
    } else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
      return aValue === bValue ? 0 : aValue ? 1 : -1;
    }
    
    // Fallback to string comparison
    return String(aValue).localeCompare(String(bValue));
  });
  
  // Reverse if direction is descending
  return direction === 'desc' ? sortedProperties.reverse() : sortedProperties;
}

/**
 * Format filter value for display in filter chips
 * @param key Filter field
 * @param operator Filter operator
 * @returns Formatted string representation
 */
export function formatFilterValue(key: string, operator: FilterOperator): string {
  if ('contains' in operator) {
    return `contains ${operator.contains}`;
  } else if ('equals' in operator) {
    return String(operator.equals);
  } else if ('min' in operator || 'max' in operator) {
    const filterOperator = operator as FilterOperatorRange;
    const min = filterOperator.min !== undefined ? formatCurrency(filterOperator.min) : 'any';
    const max = filterOperator.max !== undefined ? formatCurrency(filterOperator.max) : 'any';
    
    if (filterOperator.min !== undefined && filterOperator.max !== undefined) {
      return `${min} - ${max}`;
    } else if (filterOperator.min !== undefined) {
      return `min ${min}`;
    } else if (filterOperator.max !== undefined) {
      return `max ${max}`;
    }
  }
  
  return 'unknown';
}

/**
 * Format a number as currency
 * @param value Numeric value
 * @returns Formatted currency string
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Get human-readable field name from filter key
 * @param key Filter key
 * @returns Formatted field name
 */
export function formatFilterFieldName(key: string): string {
  // Handle nested paths
  const parts = key.split('.');
  const lastPart = parts[parts.length - 1];
  
  // Convert camelCase to Title Case
  return lastPart
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
}