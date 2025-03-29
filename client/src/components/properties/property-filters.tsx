import React, { useState } from 'react';
import { Property } from '@shared/schema';
import { PropertySearchPanel } from './property-search-panel';
import { ActiveFilterChips } from './active-filter-chips';
import { filterProperties } from '@/lib/property-filter';
import { PropertyFilters } from '@/lib/property-filter-types';

interface PropertyFiltersProps {
  onFilterChange: (filteredProperties: Property[]) => void;
  properties: Property[];
}

export function PropertyFilterContainer({ onFilterChange, properties }: PropertyFiltersProps) {
  // State to track active filters
  const [activeFilters, setActiveFilters] = useState<PropertyFilters>({});
  // State to track saved searches
  const [savedSearches, setSavedSearches] = useState<{ name: string; filters: PropertyFilters }[]>([]);

  // Apply filters using our filter utility function
  const handleFilterChange = (filters: PropertyFilters) => {
    setActiveFilters(filters);
    const filteredProperties = filterProperties(properties, filters);
    onFilterChange(filteredProperties);
  };

  // Remove a single filter
  const handleRemoveFilter = (key: string) => {
    const newFilters = { ...activeFilters };
    delete newFilters[key];
    setActiveFilters(newFilters);
    const filteredProperties = filterProperties(properties, newFilters);
    onFilterChange(filteredProperties);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setActiveFilters({});
    onFilterChange(properties);
  };

  // Save a search to be reused later
  const handleSaveSearch = (name: string, filters: PropertyFilters) => {
    const newSavedSearches = [...savedSearches];
    // Check if a search with this name already exists
    const existingIndex = newSavedSearches.findIndex(search => search.name === name);
    
    if (existingIndex >= 0) {
      // Update existing search
      newSavedSearches[existingIndex] = { name, filters };
    } else {
      // Add new search
      newSavedSearches.push({ name, filters });
    }
    
    setSavedSearches(newSavedSearches);
  };

  return (
    <div className="space-y-4">
      {/* Advanced search panel */}
      <PropertySearchPanel
        properties={properties}
        onFilterChange={handleFilterChange}
        onSaveSearch={handleSaveSearch}
        initialFilters={activeFilters}
      />
      
      {/* Show active filter chips if any filters are applied */}
      {Object.keys(activeFilters).length > 0 && (
        <ActiveFilterChips
          activeFilters={activeFilters}
          onRemoveFilter={handleRemoveFilter}
          onClearFilters={handleClearFilters}
        />
      )}
      
      {/* If there are saved searches, we could add a component to list and select them here */}
      {savedSearches.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-sm font-medium text-muted-foreground">Saved Searches:</span>
          {savedSearches.map(search => (
            <button
              key={search.name}
              onClick={() => handleFilterChange(search.filters)}
              className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80"
            >
              {search.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}