import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Property } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, Building, MapPin, ArrowUpDown } from 'lucide-react';
import { PropertyFilters } from './property-filters';
import { PropertyBatchActions } from './property-batch-actions';

interface PropertyListProps {
  properties: Property[];
  isLoading: boolean;
  onPropertySelect: (property: Property) => void;
}

export function PropertyList({ properties, isLoading, onPropertySelect }: PropertyListProps) {
  const [filteredProperties, setFilteredProperties] = useState<Property[]>(properties);
  const [selectedProperties, setSelectedProperties] = useState<Property[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Property | null,
    direction: 'asc' | 'desc'
  }>({ key: null, direction: 'asc' });

  // Update filteredProperties when the properties prop changes
  React.useEffect(() => {
    setFilteredProperties(properties);
  }, [properties]);

  // Handle select/deselect all properties
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProperties(filteredProperties);
    } else {
      setSelectedProperties([]);
    }
  };

  // Handle select/deselect a single property
  const handleSelectProperty = (property: Property, checked: boolean) => {
    if (checked) {
      setSelectedProperties([...selectedProperties, property]);
    } else {
      setSelectedProperties(selectedProperties.filter(p => p.id !== property.id));
    }
  };

  // Clear all selected properties
  const handleClearSelection = () => {
    setSelectedProperties([]);
  };

  // Handle sorting
  const handleSort = (key: keyof Property) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig.key === key) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    
    setSortConfig({ key, direction });
    
    const sortedProperties = [...filteredProperties].sort((a, b) => {
      if (a[key] == null) return 1;
      if (b[key] == null) return -1;
      
      if (typeof a[key] === 'string' && typeof b[key] === 'string') {
        return direction === 'asc'
          ? (a[key] as string).localeCompare(b[key] as string)
          : (b[key] as string).localeCompare(a[key] as string);
      }
      
      return direction === 'asc'
        ? (a[key] as number) - (b[key] as number)
        : (b[key] as number) - (a[key] as number);
    });
    
    setFilteredProperties(sortedProperties);
  };

  // Create sortable header
  const SortableHeader = ({ column, label }: { column: keyof Property, label: string }) => (
    <TableHead className="cursor-pointer" onClick={() => handleSort(column)}>
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        {sortConfig.key === column && (
          <ArrowUpDown className={`h-4 w-4 ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
        )}
      </div>
    </TableHead>
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-10">
        <Building className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No properties found</h3>
        <p className="text-muted-foreground mt-2">
          You haven't added any properties yet. Add a new property to get started.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Add filters */}
      <PropertyFilters 
        properties={properties} 
        onFilterChange={setFilteredProperties} 
      />

      {/* Batch actions component */}
      <PropertyBatchActions 
        selectedProperties={selectedProperties}
        onClearSelection={handleClearSelection}
      />

      {/* Properties table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox 
                checked={selectedProperties.length > 0 && selectedProperties.length === filteredProperties.length}
                onCheckedChange={handleSelectAll}
                aria-label="Select all properties"
              />
            </TableHead>
            <SortableHeader column="address" label="Address" />
            <SortableHeader column="parcelId" label="Parcel ID" />
            <SortableHeader column="propertyType" label="Type" />
            <SortableHeader column="status" label="Status" />
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProperties.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center h-24">
                <div className="flex flex-col items-center justify-center">
                  <Building className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No properties match the current filters</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            filteredProperties.map((property) => (
              <TableRow key={property.id}>
                <TableCell>
                  <Checkbox 
                    checked={selectedProperties.some(p => p.id === property.id)}
                    onCheckedChange={(checked) => handleSelectProperty(property, checked === true)}
                    aria-label={`Select property ${property.address}`}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div>
                      <div>{property.address}</div>
                      <div className="text-xs text-muted-foreground">
                        {property.city}, {property.state} {property.zipCode}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{property.parcelId}</TableCell>
                <TableCell>{property.propertyType}</TableCell>
                <TableCell>
                  <Badge 
                    variant={property.status === 'active' ? 'default' : 
                            property.status === 'pending' ? 'outline' : 
                            property.status === 'review' ? 'secondary' : 'destructive'}
                  >
                    {property.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onPropertySelect(property)}
                    className="gap-1"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      
      {/* Pagination can be added here in the future */}
    </div>
  );
}