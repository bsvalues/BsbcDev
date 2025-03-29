import React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatFilterValue, formatFilterFieldName } from '@/lib/property-filter';
import { PropertyFilters } from '@/lib/property-filter-types';

interface ActiveFilterChipsProps {
  activeFilters: PropertyFilters;
  onRemoveFilter: (key: string) => void;
  onClearFilters: () => void;
}

export function ActiveFilterChips({
  activeFilters,
  onRemoveFilter,
  onClearFilters
}: ActiveFilterChipsProps) {
  const filterKeys = Object.keys(activeFilters);
  
  if (filterKeys.length === 0) {
    return null;
  }
  
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-sm font-medium text-muted-foreground mr-1">Active Filters:</span>
      
      {filterKeys.map(key => (
        <Badge 
          key={key} 
          variant="outline" 
          className="flex items-center gap-1 px-2 py-1 bg-muted/40"
        >
          <span className="text-xs">
            <span className="font-medium">{formatFilterFieldName(key)}:</span>{' '}
            {formatFilterValue(key, activeFilters[key])}
          </span>
          <button 
            onClick={() => onRemoveFilter(key)}
            className="ml-1 rounded-full hover:bg-muted"
            aria-label={`Remove ${key} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onClearFilters}
        className="ml-2 h-7 text-xs"
      >
        Clear All
      </Button>
    </div>
  );
}