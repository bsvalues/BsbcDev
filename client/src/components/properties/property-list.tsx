import React from 'react';
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
import { Property } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, Building, MapPin } from 'lucide-react';

interface PropertyListProps {
  properties: Property[];
  isLoading: boolean;
  onPropertySelect: (property: Property) => void;
}

export function PropertyList({ properties, isLoading, onPropertySelect }: PropertyListProps) {
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Address</TableHead>
          <TableHead>Parcel ID</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {properties.map((property) => (
          <TableRow key={property.id}>
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
        ))}
      </TableBody>
    </Table>
  );
}