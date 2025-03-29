import React, { useState, useEffect } from 'react';
import { 
  Search,
  ChevronDown,
  ChevronUp,
  Filter,
  Save,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { formatCurrency } from '@/lib/property-filter';
import { PropertyFilters, FilterOperatorContains, FilterOperatorEquals, FilterOperatorRange } from '@/lib/property-filter-types';
import { Property } from '@shared/schema';

// Property types list for dropdown
const propertyTypes = [
  'residential',
  'commercial',
  'industrial',
  'agricultural',
  'mixed-use',
  'vacant',
  'other'
];

// Property status options
const propertyStatuses = [
  'active',
  'pending',
  'review',
  'inactive',
  'exempt'
];

// State options (simplified list)
const stateOptions = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

interface PropertySearchPanelProps {
  properties: Property[];
  onFilterChange: (filters: PropertyFilters) => void;
  onSaveSearch: (name: string, filters: PropertyFilters) => void;
  initialFilters?: PropertyFilters;
}

export function PropertySearchPanel({
  properties,
  onFilterChange,
  onSaveSearch,
  initialFilters = {}
}: PropertySearchPanelProps) {
  // State to track if advanced filters are shown
  const [isExpanded, setIsExpanded] = useState(false);
  
  // State for save search dialog
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [searchName, setSearchName] = useState('');
  
  // State to track filter values
  const [filters, setFilters] = useState<{
    address: string;
    city: string;
    state: string;
    propertyType: string;
    status: string;
    buildingArea: [number, number];
    yearBuilt: [number, number];
    marketValue: [number, number];
  }>({
    address: '',
    city: '',
    state: '',
    propertyType: '',
    status: '',
    buildingArea: [0, 10000],
    yearBuilt: [1900, new Date().getFullYear()],
    marketValue: [0, 1000000]
  });
  
  // Calculate min/max values from properties for sliders
  const [ranges, setRanges] = useState({
    buildingArea: { min: 0, max: 10000 },
    yearBuilt: { min: 1900, max: new Date().getFullYear() },
    marketValue: { min: 0, max: 1000000 }
  });
  
  // Initialize ranges from properties data
  useEffect(() => {
    if (properties && properties.length > 0) {
      const buildingAreas = properties
        .map(p => p.buildingArea !== null ? p.buildingArea : 0)
        .filter(val => val > 0);
      
      const yearBuilts = properties
        .map(p => p.yearBuilt || 0)
        .filter(val => val > 0);
      
      const marketValues = properties
        .map(p => (p.propertyDetails as any)?.marketValue || 0)
        .filter(val => val > 0);
      
      setRanges({
        buildingArea: {
          min: buildingAreas.length > 0 ? Math.min(...buildingAreas) : 0,
          max: buildingAreas.length > 0 ? Math.max(...buildingAreas) : 10000
        },
        yearBuilt: {
          min: yearBuilts.length > 0 ? Math.min(...yearBuilts) : 1900,
          max: yearBuilts.length > 0 ? Math.max(...yearBuilts) : new Date().getFullYear()
        },
        marketValue: {
          min: marketValues.length > 0 ? Math.min(...marketValues) : 0,
          max: marketValues.length > 0 ? Math.max(...marketValues) : 1000000
        }
      });
      
      // Update slider values to match ranges
      setFilters(prev => ({
        ...prev,
        buildingArea: [ranges.buildingArea.min, ranges.buildingArea.max],
        yearBuilt: [ranges.yearBuilt.min, ranges.yearBuilt.max],
        marketValue: [ranges.marketValue.min, ranges.marketValue.max]
      }));
    }
  }, [properties]);
  
  // Initialize filters from initialFilters prop
  useEffect(() => {
    if (Object.keys(initialFilters).length > 0) {
      const newFilters = { ...filters };
      
      // Update text filters
      if ('address' in initialFilters && 'contains' in initialFilters.address) {
        newFilters.address = initialFilters.address.contains;
      }
      
      if ('city' in initialFilters && 'equals' in initialFilters.city) {
        newFilters.city = initialFilters.city.equals as string;
      }
      
      if ('state' in initialFilters && 'equals' in initialFilters.state) {
        newFilters.state = initialFilters.state.equals as string;
      }
      
      if ('propertyType' in initialFilters && 'equals' in initialFilters.propertyType) {
        newFilters.propertyType = initialFilters.propertyType.equals as string;
      }
      
      if ('status' in initialFilters && 'equals' in initialFilters.status) {
        newFilters.status = initialFilters.status.equals as string;
      }
      
      // Update range filters
      if ('buildingArea' in initialFilters && ('min' in initialFilters.buildingArea || 'max' in initialFilters.buildingArea)) {
        const rangeFilter = initialFilters.buildingArea as FilterOperatorRange;
        const minVal = 'min' in rangeFilter ? rangeFilter.min || ranges.buildingArea.min : ranges.buildingArea.min;
        const maxVal = 'max' in rangeFilter ? rangeFilter.max || ranges.buildingArea.max : ranges.buildingArea.max;
        newFilters.buildingArea = [minVal, maxVal];
      }
      
      if ('yearBuilt' in initialFilters && ('min' in initialFilters.yearBuilt || 'max' in initialFilters.yearBuilt)) {
        const rangeFilter = initialFilters.yearBuilt as FilterOperatorRange;
        const minVal = 'min' in rangeFilter ? rangeFilter.min || ranges.yearBuilt.min : ranges.yearBuilt.min;
        const maxVal = 'max' in rangeFilter ? rangeFilter.max || ranges.yearBuilt.max : ranges.yearBuilt.max;
        newFilters.yearBuilt = [minVal, maxVal];
      }
      
      if ('propertyDetails.marketValue' in initialFilters) {
        const marketValueFilter = initialFilters['propertyDetails.marketValue'] as FilterOperatorRange;
        if ('min' in marketValueFilter || 'max' in marketValueFilter) {
          const minVal = 'min' in marketValueFilter ? marketValueFilter.min || ranges.marketValue.min : ranges.marketValue.min;
          const maxVal = 'max' in marketValueFilter ? marketValueFilter.max || ranges.marketValue.max : ranges.marketValue.max;
          newFilters.marketValue = [minVal, maxVal];
        }
      }
      
      setFilters(newFilters);
      
      // If there are initial filters, expand the advanced search
      if (Object.keys(initialFilters).length > 0) {
        setIsExpanded(true);
      }
    }
  }, [initialFilters]);
  
  // Convert UI filter state to PropertyFilters format and apply filters
  const applyFilters = () => {
    const appliedFilters: PropertyFilters = {};
    
    // Text filters
    if (filters.address) {
      appliedFilters.address = { contains: filters.address };
    }
    
    if (filters.city) {
      appliedFilters.city = { equals: filters.city };
    }
    
    if (filters.state) {
      appliedFilters.state = { equals: filters.state };
    }
    
    if (filters.propertyType) {
      appliedFilters.propertyType = { equals: filters.propertyType };
    }
    
    if (filters.status) {
      appliedFilters.status = { equals: filters.status };
    }
    
    // Range filters - only apply if not at min/max
    if (filters.buildingArea[0] > ranges.buildingArea.min || 
        filters.buildingArea[1] < ranges.buildingArea.max) {
      appliedFilters.buildingArea = {
        min: filters.buildingArea[0],
        max: filters.buildingArea[1]
      };
    }
    
    if (filters.yearBuilt[0] > ranges.yearBuilt.min || 
        filters.yearBuilt[1] < ranges.yearBuilt.max) {
      appliedFilters.yearBuilt = {
        min: filters.yearBuilt[0],
        max: filters.yearBuilt[1]
      };
    }
    
    if (filters.marketValue[0] > ranges.marketValue.min || 
        filters.marketValue[1] < ranges.marketValue.max) {
      appliedFilters['propertyDetails.marketValue'] = {
        min: filters.marketValue[0],
        max: filters.marketValue[1]
      };
    }
    
    onFilterChange(appliedFilters);
  };
  
  // Clear all filters
  const clearFilters = () => {
    setFilters({
      address: '',
      city: '',
      state: '',
      propertyType: '',
      status: '',
      buildingArea: [ranges.buildingArea.min, ranges.buildingArea.max],
      yearBuilt: [ranges.yearBuilt.min, ranges.yearBuilt.max],
      marketValue: [ranges.marketValue.min, ranges.marketValue.max]
    });
  };
  
  // Handle save search
  const handleSaveSearch = () => {
    // Convert current filters to PropertyFilters format
    const currentFilters: PropertyFilters = {};
    
    if (filters.address) {
      currentFilters.address = { contains: filters.address };
    }
    
    if (filters.city) {
      currentFilters.city = { equals: filters.city };
    }
    
    if (filters.state) {
      currentFilters.state = { equals: filters.state };
    }
    
    if (filters.propertyType) {
      currentFilters.propertyType = { equals: filters.propertyType };
    }
    
    if (filters.status) {
      currentFilters.status = { equals: filters.status };
    }
    
    // Include range filters
    if (filters.buildingArea[0] > ranges.buildingArea.min || 
        filters.buildingArea[1] < ranges.buildingArea.max) {
      currentFilters.buildingArea = {
        min: filters.buildingArea[0],
        max: filters.buildingArea[1]
      };
    }
    
    if (filters.yearBuilt[0] > ranges.yearBuilt.min || 
        filters.yearBuilt[1] < ranges.yearBuilt.max) {
      currentFilters.yearBuilt = {
        min: filters.yearBuilt[0],
        max: filters.yearBuilt[1]
      };
    }
    
    if (filters.marketValue[0] > ranges.marketValue.min || 
        filters.marketValue[1] < ranges.marketValue.max) {
      currentFilters['propertyDetails.marketValue'] = {
        min: filters.marketValue[0],
        max: filters.marketValue[1]
      };
    }
    
    // Save the search with the given name
    onSaveSearch(searchName, currentFilters);
    setSaveDialogOpen(false);
    setSearchName('');
  };
  
  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <Search className="mr-2 h-5 w-5" />
            Property Search
          </CardTitle>
          <CollapsibleTrigger asChild onClick={() => setIsExpanded(!isExpanded)}>
            <Button variant="ghost" size="sm">
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Hide Filters
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Show Filters
                </>
              )}
            </Button>
          </CollapsibleTrigger>
        </div>
      </CardHeader>
      <Collapsible open={isExpanded} className="w-full">
        <CollapsibleContent>
          <CardContent className="pb-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Basic filters */}
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="Search address"
                  value={filters.address}
                  onChange={(e) => setFilters({ ...filters, address: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Enter city"
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Select
                  value={filters.state}
                  onValueChange={(value) => setFilters({ ...filters, state: value })}
                >
                  <SelectTrigger id="state">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any state</SelectItem>
                    {stateOptions.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="propertyType">Property Type</Label>
                <Select
                  value={filters.propertyType}
                  onValueChange={(value) => setFilters({ ...filters, propertyType: value })}
                >
                  <SelectTrigger id="propertyType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any type</SelectItem>
                    {propertyTypes.map(type => (
                      <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any status</SelectItem>
                    {propertyStatuses.map(status => (
                      <SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Advanced filters */}
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-4">Additional Filters</h3>
              
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <Label>Building Area (sq ft)</Label>
                      <span className="text-xs text-muted-foreground">
                        {filters.buildingArea[0]} - {filters.buildingArea[1]}
                      </span>
                    </div>
                    <Slider
                      min={ranges.buildingArea.min}
                      max={ranges.buildingArea.max}
                      step={100}
                      value={filters.buildingArea}
                      onValueChange={(value) => setFilters({ ...filters, buildingArea: value as [number, number] })}
                      className="mb-4"
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <Label>Year Built</Label>
                      <span className="text-xs text-muted-foreground">
                        {filters.yearBuilt[0]} - {filters.yearBuilt[1]}
                      </span>
                    </div>
                    <Slider
                      min={ranges.yearBuilt.min}
                      max={ranges.yearBuilt.max}
                      step={1}
                      value={filters.yearBuilt}
                      onValueChange={(value) => setFilters({ ...filters, yearBuilt: value as [number, number] })}
                      className="mb-4"
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <Label>Market Value</Label>
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(filters.marketValue[0])} - {formatCurrency(filters.marketValue[1])}
                      </span>
                    </div>
                    <Slider
                      min={ranges.marketValue.min}
                      max={ranges.marketValue.max}
                      step={10000}
                      value={filters.marketValue}
                      onValueChange={(value) => setFilters({ ...filters, marketValue: value as [number, number] })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between pt-0">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
              <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Save className="h-4 w-4 mr-1" />
                    Save Search
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save Search</DialogTitle>
                    <DialogDescription>
                      Give your search a name to save it for future use.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Label htmlFor="searchName" className="mb-2">Search Name</Label>
                    <Input
                      id="searchName"
                      placeholder="My Property Search"
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveSearch} disabled={!searchName}>
                      Save
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <Button onClick={applyFilters} size="sm">
              <Filter className="h-4 w-4 mr-1" />
              Apply Filters
            </Button>
          </CardFooter>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}