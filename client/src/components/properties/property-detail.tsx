import React from 'react';
import { Property } from '@shared/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { 
  Home, 
  MapPin, 
  Calendar, 
  ArrowLeft, 
  Edit, 
  User,
  Building,
  Ruler,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';

interface PropertyDetailProps {
  property: Property;
  onBack: () => void;
}

export function PropertyDetail({ property, onBack }: PropertyDetailProps) {
  // Fetch additional property details if needed
  const { data: taxRates, isLoading: isTaxRatesLoading } = useQuery({
    queryKey: ['/api-gateway/properties/tax-rates'],
    refetchOnWindowFocus: false,
  });

  const formatDate = (date: Date) => {
    return format(new Date(date), 'MMM d, yyyy');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h2 className="text-2xl font-bold">{property.address}</h2>
        <Badge>{property.status}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Property Overview
            </CardTitle>
            <CardDescription>Basic property information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Parcel ID</div>
                <div>{property.parcelId}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Property Type</div>
                <div className="capitalize">{property.propertyType}</div>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">Address</div>
              <div className="flex items-start">
                <MapPin className="h-4 w-4 mr-1 mt-1 text-muted-foreground" />
                <div>
                  {property.address}<br />
                  {property.city}, {property.state} {property.zipCode}
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">Description</div>
              <div>{property.description || 'No description provided'}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Zone Code</div>
                <div>{property.zoneCode}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Created</div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                  {formatDate(property.createdAt)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5" />
              Property Details
            </CardTitle>
            <CardDescription>Size and additional information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Land Area</div>
                <div>{property.landArea.toLocaleString()} sq ft</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Building Area</div>
                <div>{property.buildingArea ? property.buildingArea.toLocaleString() + ' sq ft' : 'N/A'}</div>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">Year Built</div>
              <div>{property.yearBuilt || 'Unknown'}</div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">Features</div>
              {property.features && property.features.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {property.features.map((feature, index) => (
                    <Badge key={index} variant="outline">{feature}</Badge>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">No features specified</div>
              )}
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">Current Tax Rate</div>
              {isTaxRatesLoading ? (
                <Skeleton className="h-4 w-20" />
              ) : taxRates && taxRates.length > 0 ? (
                <div className="flex items-center font-semibold">
                  {taxRates.find(rate => 
                    rate.propertyType === property.propertyType && 
                    rate.zoneCode === property.zoneCode)?.millageRate || 'N/A'} mills
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">No tax rate information available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Property Documents & History
          </CardTitle>
          <CardDescription>Related documents and historical changes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Last Updated</div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                {formatDate(property.updatedAt)}
                {property.updatedBy && (
                  <span className="flex items-center ml-2">
                    <User className="h-4 w-4 mr-1 text-muted-foreground" />
                    User ID: {property.updatedBy}
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">Owner Contact</div>
              {property.ownerContact ? (
                <div>{property.ownerContact}</div>
              ) : (
                <div className="text-muted-foreground text-sm">No owner contact information</div>
              )}
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">Additional Details</div>
              {property.propertyDetails ? (
                <pre className="text-sm bg-muted p-2 rounded-md overflow-auto">
                  {JSON.stringify(property.propertyDetails, null, 2)}
                </pre>
              ) : (
                <div className="text-muted-foreground text-sm">No additional details</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}