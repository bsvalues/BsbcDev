import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { X, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Property } from '@shared/schema';

interface PropertyFiltersProps {
  onFilterChange: (filteredProperties: Property[]) => void;
  properties: Property[];
}

export function PropertyFilters({ onFilterChange, properties }: PropertyFiltersProps) {
  const [expanded, setExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [propertyType, setPropertyType] = useState<string>('');
  const [minValue, setMinValue] = useState<number | null>(null);
  const [maxValue, setMaxValue] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');

  // Get unique property types from data
  const propertyTypes = React.useMemo(() => {
    if (!properties || !Array.isArray(properties)) return [];
    const types = new Set<string>();
    properties.forEach(property => {
      if (property.propertyType) {
        types.add(property.propertyType);
      }
    });
    return Array.from(types);
  }, [properties]);

  // Get unique cities from data
  const cities = React.useMemo(() => {
    if (!properties || !Array.isArray(properties)) return [];
    const citySet = new Set<string>();
    properties.forEach(property => {
      if (property.city) {
        citySet.add(property.city);
      }
    });
    return Array.from(citySet);
  }, [properties]);

  // Get unique states from data
  const states = React.useMemo(() => {
    if (!properties || !Array.isArray(properties)) return [];
    const stateSet = new Set<string>();
    properties.forEach(property => {
      if (property.state) {
        stateSet.add(property.state);
      }
    });
    return Array.from(stateSet);
  }, [properties]);

  // Get unique statuses from data
  const statuses = React.useMemo(() => {
    if (!properties || !Array.isArray(properties)) return [];
    const statusSet = new Set<string>();
    properties.forEach(property => {
      if (property.status) {
        statusSet.add(property.status);
      }
    });
    return Array.from(statusSet);
  }, [properties]);

  // Get min and max values for the slider
  const valueBounds = React.useMemo(() => {
    if (!properties || !Array.isArray(properties)) return { min: 0, max: 1000000 };
    
    let min = Number.MAX_SAFE_INTEGER;
    let max = 0;
    
    properties.forEach(property => {
      // Using the assessed value from the latest valuation if available
      if (property.lastAssessedValue && property.lastAssessedValue < min) {
        min = property.lastAssessedValue;
      }
      if (property.lastAssessedValue && property.lastAssessedValue > max) {
        max = property.lastAssessedValue;
      }
    });
    
    // Set reasonable defaults if no data
    if (min === Number.MAX_SAFE_INTEGER) min = 0;
    if (max === 0) max = 1000000;
    
    // Round to nearest 10,000 for better UX
    min = Math.floor(min / 10000) * 10000;
    max = Math.ceil(max / 10000) * 10000;
    
    return { min, max };
  }, [properties]);

  // Apply filters
  const applyFilters = () => {
    if (!properties || !Array.isArray(properties)) {
      onFilterChange([]);
      return;
    }

    let filtered = [...properties];

    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(property => 
        property.address?.toLowerCase().includes(term) ||
        property.city?.toLowerCase().includes(term) ||
        property.state?.toLowerCase().includes(term) ||
        property.zipCode?.toLowerCase().includes(term) ||
        property.parcelId?.toLowerCase().includes(term)
      );
    }

    // Apply property type filter
    if (propertyType) {
      filtered = filtered.filter(property => property.propertyType === propertyType);
    }

    // Apply city filter
    if (city) {
      filtered = filtered.filter(property => property.city === city);
    }

    // Apply state filter
    if (state) {
      filtered = filtered.filter(property => property.state === state);
    }

    // Apply status filter
    if (status) {
      filtered = filtered.filter(property => property.status === status);
    }

    // Apply value range filter
    if (minValue !== null) {
      filtered = filtered.filter(property => 
        property.lastAssessedValue && property.lastAssessedValue >= minValue
      );
    }

    if (maxValue !== null) {
      filtered = filtered.filter(property => 
        property.lastAssessedValue && property.lastAssessedValue <= maxValue
      );
    }

    onFilterChange(filtered);
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setPropertyType('');
    setMinValue(null);
    setMaxValue(null);
    setStatus('');
    setCity('');
    setState('');
    onFilterChange(properties); // Reset to original data
  };

  // Apply filters on any change
  React.useEffect(() => {
    applyFilters();
  }, [searchTerm, propertyType, minValue, maxValue, status, city, state]);

  return (
    <Card className="mb-6">
      <CardContent className="pt-4">
        <div className="flex flex-col space-y-4">
          {/* Search and expand button */}
          <div className="flex gap-2">
            <div className="relative w-full">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search properties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setExpanded(!expanded)}
              className="shrink-0"
            >
              <Filter className="h-4 w-4 mr-1" />
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>

          {/* Advanced filters */}
          {expanded && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="propertyType">Property Type</Label>
                <Select value={propertyType} onValueChange={setPropertyType}>
                  <SelectTrigger id="propertyType">
                    <SelectValue placeholder="All property types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All property types</SelectItem>
                    {propertyTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger id="city">
                    <SelectValue placeholder="All cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All cities</SelectItem>
                    {cities.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger id="state">
                    <SelectValue placeholder="All states" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All states</SelectItem>
                    {states.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    {statuses.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="flex justify-between">
                  <Label>Value Range</Label>
                  <div className="text-sm text-muted-foreground">
                    {new Intl.NumberFormat('en-US', { 
                      style: 'currency', 
                      currency: 'USD',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(minValue || valueBounds.min)} - 
                    {new Intl.NumberFormat('en-US', { 
                      style: 'currency', 
                      currency: 'USD',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(maxValue || valueBounds.max)}
                  </div>
                </div>
                <Slider
                  defaultValue={[valueBounds.min, valueBounds.max]}
                  min={valueBounds.min}
                  max={valueBounds.max}
                  step={10000}
                  onValueChange={(value) => {
                    setMinValue(value[0]);
                    setMaxValue(value[1]);
                  }}
                  className="py-4"
                />
              </div>

              <div className="md:col-span-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetFilters}
                  className="w-full md:w-auto"
                >
                  Reset Filters
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}