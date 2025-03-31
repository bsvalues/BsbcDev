import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { PropertyFilters, StringFilter, NumericFilter, DateFilter, BooleanFilter } from '@/lib/property-filter-types';

interface ActiveFilterChipsProps {
  filters: PropertyFilters;
  onRemoveFilter: (fieldName: string) => void;
  onClearAllFilters: () => void;
  formatFieldName: (fieldName: string) => string;
}

export function ActiveFilterChips({
  filters,
  onRemoveFilter,
  onClearAllFilters,
  formatFieldName
}: ActiveFilterChipsProps) {
  const hasActiveFilters = Object.keys(filters).length > 0;
  
  if (!hasActiveFilters) {
    return null;
  }
  
  // Format a filter value for display
  const formatFilterValue = (fieldName: string, filter: any): string => {
    // Handle string filters
    if ('contains' in filter) {
      return `contains "${filter.contains}"`;
    }
    
    if ('equals' in filter && typeof filter.equals === 'string') {
      return `is "${filter.equals}"`;
    }
    
    // Handle numeric filters
    if ('min' in filter && 'max' in filter) {
      return `${filter.min.toLocaleString()} - ${filter.max.toLocaleString()}`;
    }
    
    if ('min' in filter) {
      return `min ${filter.min.toLocaleString()}`;
    }
    
    if ('max' in filter) {
      return `max ${filter.max.toLocaleString()}`;
    }
    
    if ('equals' in filter && typeof filter.equals === 'number') {
      return `= ${filter.equals.toLocaleString()}`;
    }
    
    // Handle boolean filters
    if ('equals' in filter && typeof filter.equals === 'boolean') {
      return filter.equals ? 'Yes' : 'No';
    }
    
    // Handle date filters
    if ('after' in filter && 'before' in filter) {
      const afterDate = new Date(filter.after);
      const beforeDate = new Date(filter.before);
      return `${afterDate.toLocaleDateString()} - ${beforeDate.toLocaleDateString()}`;
    }
    
    // Generic fallback
    return JSON.stringify(filter).replace(/[{}"]/g, '');
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Active Filters</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClearAllFilters}
          className="text-xs h-6 px-2"
        >
          Clear All
        </Button>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {Object.entries(filters).map(([fieldName, filter]) => (
          <div 
            key={fieldName}
            className="bg-muted flex items-center gap-1 text-sm rounded-full px-3 py-1"
          >
            <span className="font-medium">{formatFieldName(fieldName)}:</span>
            <span>{formatFilterValue(fieldName, filter)}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-4 w-4 rounded-full"
              onClick={() => onRemoveFilter(fieldName)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}