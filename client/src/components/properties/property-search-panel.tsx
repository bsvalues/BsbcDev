import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PropertyFilters } from '@/lib/property-filter-types';
import { Slider } from '@/components/ui/slider';
import { formatFilterFieldName } from '@/lib/property-filter';
import { ActiveFilterChips } from './active-filter-chips';

interface PropertySearchPanelProps {
  onFiltersChange: (filters: PropertyFilters) => void;
  propertyTypes?: string[];
  bedrooms?: number[];
  bathrooms?: number[];
}

export function PropertySearchPanel({
  onFiltersChange,
  propertyTypes = ['Single Family', 'Multi Family', 'Condo', 'Townhouse', 'Commercial'],
  bedrooms = [1, 2, 3, 4, 5, 6],
  bathrooms = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
}: PropertySearchPanelProps) {
  const [filters, setFilters] = useState<PropertyFilters>({});
  const [searchText, setSearchText] = useState('');
  const [priceRange, setPriceRange] = useState([0, 1000000]);

  // Apply text search across multiple fields
  const handleTextSearch = () => {
    if (!searchText.trim()) {
      const newFilters = { ...filters };
      delete newFilters.address;
      delete newFilters.city;
      setFilters(newFilters);
      onFiltersChange(newFilters);
      return;
    }

    const newFilters = {
      ...filters,
      address: { contains: searchText }
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  // Handle property type selection
  const handlePropertyTypeChange = (type: string, checked: boolean) => {
    let selectedTypes: string[] = [];
    
    // Get currently selected property types (if any)
    if (filters.propertyType && 'equals' in filters.propertyType) {
      selectedTypes = Array.isArray(filters.propertyType.equals) 
        ? [...filters.propertyType.equals as string[]] 
        : [filters.propertyType.equals as string];
    }
    
    // Update the selection
    if (checked) {
      selectedTypes.push(type);
    } else {
      selectedTypes = selectedTypes.filter(t => t !== type);
    }
    
    const newFilters = { ...filters };
    
    if (selectedTypes.length === 0) {
      delete newFilters.propertyType;
    } else if (selectedTypes.length === 1) {
      newFilters.propertyType = { equals: selectedTypes[0] };
    } else {
      // In a real implementation, we would handle multiple values differently
      // For this demo, we'll just use the first value
      newFilters.propertyType = { equals: selectedTypes[0] };
    }
    
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  // Handle bedroom selection
  const handleBedroomsChange = (value: string) => {
    const numValue = parseInt(value);
    const newFilters = { ...filters };
    
    if (value === 'any') {
      delete newFilters.bedrooms;
    } else {
      newFilters.bedrooms = { equals: numValue };
    }
    
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  // Handle bathroom selection
  const handleBathroomsChange = (value: string) => {
    const numValue = parseFloat(value);
    const newFilters = { ...filters };
    
    if (value === 'any') {
      delete newFilters.bathrooms;
    } else {
      newFilters.bathrooms = { equals: numValue };
    }
    
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  // Handle price range selection
  const handlePriceRangeChange = (values: number[]) => {
    setPriceRange(values);
    
    const newFilters = {
      ...filters,
      marketValue: {
        min: values[0],
        max: values[1]
      }
    };
    
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  // Remove a specific filter
  const handleRemoveFilter = (fieldName: string) => {
    const newFilters = { ...filters };
    delete newFilters[fieldName];
    setFilters(newFilters);
    onFiltersChange(newFilters);
    
    // Reset UI state as needed
    if (fieldName === 'address') {
      setSearchText('');
    } else if (fieldName === 'marketValue') {
      setPriceRange([0, 1000000]);
    }
  };

  // Clear all filters
  const handleClearAllFilters = () => {
    setFilters({});
    setSearchText('');
    setPriceRange([0, 1000000]);
    onFiltersChange({});
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Property Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Text search */}
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search address or city"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTextSearch()}
              />
              <Button onClick={handleTextSearch}>Search</Button>
            </div>
            
            {/* Property type checkboxes */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Property Type</h3>
              <div className="grid grid-cols-2 gap-2">
                {propertyTypes.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${type}`}
                      checked={
                        filters.propertyType && 
                        'equals' in filters.propertyType && 
                        (filters.propertyType.equals === type || 
                         (Array.isArray(filters.propertyType.equals) && 
                          filters.propertyType.equals.includes(type)))
                      }
                      onCheckedChange={(checked) => 
                        handlePropertyTypeChange(type, checked as boolean)
                      }
                    />
                    <Label htmlFor={`type-${type}`}>{type}</Label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Bedrooms dropdown */}
            <div className="space-y-2">
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Select 
                onValueChange={handleBedroomsChange}
                value={
                  filters.bedrooms && 'equals' in filters.bedrooms
                    ? String(filters.bedrooms.equals)
                    : 'any'
                }
              >
                <SelectTrigger id="bedrooms">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {bedrooms.map((num) => (
                    <SelectItem key={num} value={String(num)}>
                      {num}+
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Bathrooms dropdown */}
            <div className="space-y-2">
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Select
                onValueChange={handleBathroomsChange}
                value={
                  filters.bathrooms && 'equals' in filters.bathrooms
                    ? String(filters.bathrooms.equals)
                    : 'any'
                }
              >
                <SelectTrigger id="bathrooms">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {bathrooms.map((num) => (
                    <SelectItem key={num} value={String(num)}>
                      {num}+
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Price range slider */}
            <div className="space-y-4">
              <div className="flex justify-between">
                <Label>Price Range</Label>
                <span className="text-sm">
                  ${priceRange[0].toLocaleString()} - ${priceRange[1].toLocaleString()}
                </span>
              </div>
              <Slider
                min={0}
                max={1000000}
                step={10000}
                value={priceRange}
                onValueChange={handlePriceRangeChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Active filters display */}
      <ActiveFilterChips
        filters={filters}
        onRemoveFilter={handleRemoveFilter}
        onClearAllFilters={handleClearAllFilters}
        formatFieldName={formatFilterFieldName}
      />
    </div>
  );
}