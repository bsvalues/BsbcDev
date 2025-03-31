import React, { useState, useEffect } from 'react';
import { Property } from '@shared/schema';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import {
  Building,
  Home,
  MapPin,
  DollarSign,
  Calendar,
  ArrowRight,
  Ruler,
  Hash,
  Tag,
  ChevronRight,
  BarChart,
  Layers
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Advanced metrics and comparison data types
interface PropertyComparison {
  metrics?: {
    [key: string]: {
      values: (number | null)[];
      min: number;
      max: number;
      difference: number;
      percentageDifference: number;
      incomplete?: boolean;
    }
  };
  advancedMetrics?: {
    pricePerSqFt?: number[];
    pricePerSqFtDifference?: number;
    pricePerSqFtPercentageDiff?: number;
    ageAdjustedValues?: {
      age: number;
      valuePerYearOfAge: number;
    }[];
  };
}

interface PropertyComparisonCarouselProps {
  properties: Property[];
  onViewDetails?: (property: Property) => void;
  onViewValuation?: (property: Property) => void;
  showAdvancedMetrics?: boolean;
}

export function PropertyComparisonCarousel({
  properties,
  onViewDetails,
  onViewValuation,
  showAdvancedMetrics = false
}: PropertyComparisonCarouselProps) {
  const { toast } = useToast();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [api, setApi] = useState<any>();
  const [comparisonData, setComparisonData] = useState<PropertyComparison | null>(null);
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);

  // Format currency values
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  // Format percentage values
  const formatPercentage = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return `${value.toFixed(1)}%`;
  };
  
  // Fetch comparison data for the properties
  useEffect(() => {
    // Only fetch comparison data if we have at least 2 properties
    if (properties.length < 2) return;
    
    const fetchComparisonData = async () => {
      setIsLoadingComparison(true);
      try {
        // Get property IDs for comparison
        const propertyIds = properties.map(p => p.id);
        
        // Call the API to get comparison data
        const response = await fetch('/api/properties/compare', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            propertyIds,
            includeAdvancedMetrics: showAdvancedMetrics
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch comparison data');
        }
        
        const data = await response.json();
        setComparisonData(data);
      } catch (error) {
        console.error('Error fetching comparison data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load property comparison data',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingComparison(false);
      }
    };
    
    fetchComparisonData();
  }, [properties, showAdvancedMetrics, toast]);

  // Handle carousel change
  const handleSelect = () => {
    if (!api) return;
    setSelectedIndex(api.selectedScrollSnap());
  };

  useEffect(() => {
    if (!api) return;
    
    // Setup listeners
    api.on('select', handleSelect);
    api.on('reInit', handleSelect);
    
    // Cleanup
    return () => {
      api.off('select', handleSelect);
    };
  }, [api]);

  // If there are no properties, show a message
  if (!properties || properties.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Property Comparison</CardTitle>
          <CardDescription>Select properties to compare</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-40">
          <p className="text-muted-foreground">No properties selected for comparison</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Property Comparison</h3>
          <p className="text-sm text-muted-foreground">
            Comparing {properties.length} properties
          </p>
        </div>
        <div className="space-x-2">
          <Badge variant="outline" className="font-normal">
            {selectedIndex + 1} of {properties.length}
          </Badge>
        </div>
      </div>
      
      {/* Comparison Metrics Section - Only shown when we have comparison data */}
      {properties.length > 1 && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart className="h-5 w-5 text-primary" />
              Property Comparison Metrics
            </CardTitle>
            <CardDescription>
              Key metrics and differences between properties
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingComparison ? (
              <div className="flex justify-center items-center h-24">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                <span className="ml-2 text-sm text-muted-foreground">Loading comparison data...</span>
              </div>
            ) : comparisonData?.metrics ? (
              <div className="space-y-4">
                {/* Assessed Value Comparison */}
                {comparisonData.metrics.assessedValue && (
                  <div className="border rounded-md p-3">
                    <h4 className="text-sm font-medium mb-2 flex items-center">
                      <DollarSign className="h-4 w-4 mr-1 text-primary" />
                      Assessed Value Difference
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-xs text-muted-foreground block">Difference</span>
                        <span className="font-medium">{formatCurrency(comparisonData.metrics.assessedValue.difference)}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Percentage</span>
                        <span className="font-medium">{formatPercentage(comparisonData.metrics.assessedValue.percentageDifference)}</span>
                      </div>
                      <div className="col-span-2 mt-1">
                        <span className="text-xs text-muted-foreground block">Range</span>
                        <span className="text-sm">{formatCurrency(comparisonData.metrics.assessedValue.min)} - {formatCurrency(comparisonData.metrics.assessedValue.max)}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Market Value Comparison */}
                {comparisonData.metrics.marketValue && (
                  <div className="border rounded-md p-3">
                    <h4 className="text-sm font-medium mb-2 flex items-center">
                      <DollarSign className="h-4 w-4 mr-1 text-primary" />
                      Market Value Difference
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-xs text-muted-foreground block">Difference</span>
                        <span className="font-medium">{formatCurrency(comparisonData.metrics.marketValue.difference)}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Percentage</span>
                        <span className="font-medium">{formatPercentage(comparisonData.metrics.marketValue.percentageDifference)}</span>
                      </div>
                      <div className="col-span-2 mt-1">
                        <span className="text-xs text-muted-foreground block">Range</span>
                        <span className="text-sm">{formatCurrency(comparisonData.metrics.marketValue.min)} - {formatCurrency(comparisonData.metrics.marketValue.max)}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Advanced Metrics */}
                {showAdvancedMetrics && comparisonData.advancedMetrics?.pricePerSqFt && (
                  <div className="border rounded-md p-3 bg-muted/30">
                    <h4 className="text-sm font-medium mb-2 flex items-center">
                      <Layers className="h-4 w-4 mr-1 text-primary" />
                      Advanced Metrics
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-xs text-muted-foreground block">Price per Sq Ft Range</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="font-medium cursor-help">
                                ${Math.min(...comparisonData.advancedMetrics.pricePerSqFt).toFixed(2)} - 
                                ${Math.max(...comparisonData.advancedMetrics.pricePerSqFt).toFixed(2)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Market value divided by building area</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Difference</span>
                        <span className="font-medium">
                          {formatPercentage(comparisonData.advancedMetrics.pricePerSqFtPercentageDiff)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No comparison data available</p>
            )}
          </CardContent>
        </Card>
      )}
      
      <Carousel
        setApi={setApi}
        className="w-full"
        opts={{
          align: 'start',
          loop: properties.length > 1,
        }}
      >
        <CarouselContent>
          {properties.map((property, index) => (
            <CarouselItem key={property.id} className="md:basis-3/4 lg:basis-1/2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="h-full"
              >
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <Badge className="w-fit mb-2" variant={
                      property.status === 'active' ? 'default' :
                      property.status === 'pending' ? 'outline' :
                      property.status === 'review' ? 'secondary' : 'destructive'
                    }>
                      {property.status.toUpperCase()}
                    </Badge>
                    <CardTitle className="flex items-start gap-2">
                      <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                      <span className="leading-tight">{property.address}</span>
                    </CardTitle>
                    <CardDescription>
                      {property.city}, {property.state} {property.zipCode}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Property Type</span>
                        <div className="flex items-center gap-1">
                          <Home className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="capitalize">{property.propertyType}</span>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Zone Code</span>
                        <div className="flex items-center gap-1">
                          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{property.zoneCode}</span>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Parcel ID</span>
                        <div className="flex items-center gap-1">
                          <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{property.parcelId}</span>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Year Built</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{property.yearBuilt || 'Unknown'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Separator className="my-3" />
                    
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Land Area</span>
                        <div className="flex items-center gap-1">
                          <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{property.landArea.toLocaleString()} sq ft</span>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Building Area</span>
                        <div className="flex items-center gap-1">
                          <Building className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{property.buildingArea ? property.buildingArea.toLocaleString() + ' sq ft' : 'N/A'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Market Value</span>
                        <div className="font-medium text-primary">
                          {property.propertyDetails && typeof property.propertyDetails === 'object' && 
                           'marketValue' in property.propertyDetails && 
                           typeof property.propertyDetails.marketValue === 'number' ? 
                            formatCurrency(property.propertyDetails.marketValue) : 'N/A'}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Assessed Value</span>
                        <div className="font-medium">
                          {property.propertyDetails && typeof property.propertyDetails === 'object' && 
                           'assessedValue' in property.propertyDetails && 
                           typeof property.propertyDetails.assessedValue === 'number' ? 
                            formatCurrency(property.propertyDetails.assessedValue) : 'N/A'}
                        </div>
                      </div>
                    </div>
                    
                    {property.features && property.features.length > 0 && (
                      <div className="mt-4">
                        <span className="text-xs text-muted-foreground block mb-1">Features</span>
                        <div className="flex flex-wrap gap-1">
                          {property.features.map((feature, i) => (
                            <Badge variant="outline" key={i} className="text-xs">{feature}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between pt-2">
                    {onViewDetails && (
                      <Button variant="outline" size="sm" onClick={() => onViewDetails(property)}>
                        Details
                      </Button>
                    )}
                    {onViewValuation && (
                      <Button size="sm" onClick={() => onViewValuation(property)} className="gap-1">
                        View Valuation
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="flex items-center justify-center mt-4">
          <CarouselPrevious className="static transform-none mx-2" />
          <div className="flex gap-1">
            {properties.map((_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index === selectedIndex ? 'bg-primary' : 'bg-muted'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
          <CarouselNext className="static transform-none mx-2" />
        </div>
      </Carousel>
    </div>
  );
}