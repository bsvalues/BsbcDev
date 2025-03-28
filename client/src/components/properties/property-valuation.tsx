import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, Calculator, Activity, ArrowRight, ArrowUpRight, Coins } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface PropertyValuationProps {
  propertyId: number;
}

export function PropertyValuation({ propertyId }: PropertyValuationProps) {
  const { toast } = useToast();
  const [valuationMethod, setValuationMethod] = useState('standard');
  const [assessmentDate, setAssessmentDate] = useState<Date>(new Date());
  const [isCalculating, setIsCalculating] = useState(false);
  const [showCalculateDialog, setShowCalculateDialog] = useState(false);

  // Fetch property valuations
  const { data: valuations, isLoading, refetch } = useQuery({
    queryKey: [`/api-gateway/properties/${propertyId}/valuations`],
    refetchOnWindowFocus: false,
  });

  // Calculate new valuation mutation
  const calculateValuation = useMutation({
    mutationFn: async () => {
      setIsCalculating(true);
      try {
        const response = await apiRequest(`/api-gateway/properties/${propertyId}/valuate`, {
          method: 'POST',
          data: {
            valuationMethod,
            assessmentDate,
          }
        });
        return response;
      } finally {
        setIsCalculating(false);
      }
    },
    onSuccess: () => {
      toast({
        title: 'Valuation Calculated',
        description: 'The property has been successfully valuated.',
      });
      
      // Close dialog and refetch valuations
      setShowCalculateDialog(false);
      refetch();
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: [`/api-gateway/properties/${propertyId}`] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to calculate valuation. Please try again.',
        variant: 'destructive',
      });
    }
  });

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format date
  const formatDate = (date: Date) => {
    return format(new Date(date), 'MMM d, yyyy');
  };

  // Valuation method options
  const valuationMethods = [
    { value: 'standard', label: 'Standard Assessment' },
    { value: 'market', label: 'Market-based Analysis' },
    { value: 'income', label: 'Income Approach' },
    { value: 'cost', label: 'Cost Approach' },
    { value: 'comparative', label: 'Comparative Sales' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-[200px]" />
      </div>
    );
  }

  // Get the most recent valuation (if any)
  const latestValuation = valuations && valuations.length > 0 
    ? valuations.sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime())[0]
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Property Valuation</h2>
        <Dialog open={showCalculateDialog} onOpenChange={setShowCalculateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-1">
              <Calculator className="h-4 w-4" />
              Calculate Valuation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Calculate Property Valuation</DialogTitle>
              <DialogDescription>
                Select a valuation method and assessment date to calculate the property value.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Valuation Method</label>
                <Select
                  value={valuationMethod}
                  onValueChange={setValuationMethod}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select valuation method" />
                  </SelectTrigger>
                  <SelectContent>
                    {valuationMethods.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Assessment Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !assessmentDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {assessmentDate ? format(assessmentDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={assessmentDate}
                      onSelect={(date) => date && setAssessmentDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCalculateDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => calculateValuation.mutate()} 
                disabled={isCalculating}
              >
                {isCalculating ? 'Calculating...' : 'Calculate Value'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Assessed Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestValuation 
                ? formatCurrency(latestValuation.assessedValue)
                : 'Not Assessed'}
            </div>
            {latestValuation && (
              <p className="text-xs text-muted-foreground mt-1">
                Assessed on {formatDate(latestValuation.assessmentDate)}
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Market Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestValuation 
                ? formatCurrency(latestValuation.marketValue)
                : 'Not Determined'}
            </div>
            {latestValuation && latestValuation.marketValue !== latestValuation.assessedValue && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <ArrowUpRight className="h-3 w-3" />
                <span>
                  {Math.round((latestValuation.marketValue / latestValuation.assessedValue - 1) * 100)}% 
                  above assessed value
                </span>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taxable Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestValuation 
                ? formatCurrency(latestValuation.taxableValue)
                : 'Not Calculated'}
            </div>
            {latestValuation && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Coins className="h-3 w-3" />
                <span>
                  {Math.round((latestValuation.taxableValue / latestValuation.assessedValue) * 100)}% 
                  of assessed value
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">Valuation History</TabsTrigger>
          <TabsTrigger value="details">Assessment Details</TabsTrigger>
        </TabsList>
        
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Valuation History</CardTitle>
              <CardDescription>
                Track assessment changes over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!valuations || valuations.length === 0 ? (
                <div className="text-center py-10">
                  <Activity className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No valuation history</h3>
                  <p className="text-muted-foreground mt-2">
                    This property has not been assessed yet. Click "Calculate Valuation" to begin.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {valuations
                    .sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime())
                    .map((valuation, index) => (
                      <div key={valuation.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">
                                Assessment {formatDate(valuation.assessmentDate)}
                              </h4>
                              {index === 0 && (
                                <Badge>Latest</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Method: {valuation.valuationMethod}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">
                              {formatCurrency(valuation.assessedValue)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Market: {formatCurrency(valuation.marketValue)}
                            </p>
                          </div>
                        </div>
                        
                        <Separator className="my-2" />
                        
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div>
                            <p className="text-sm font-medium">Taxable Value</p>
                            <p>{formatCurrency(valuation.taxableValue)}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Effective Date</p>
                            <p className="flex items-center">
                              <CalendarIcon className="h-3 w-3 mr-1 text-muted-foreground" />
                              {formatDate(valuation.effectiveDate)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="details" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Details</CardTitle>
              <CardDescription>
                Detailed breakdown of the current assessment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!latestValuation ? (
                <div className="text-center py-10">
                  <Calculator className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No assessment data</h3>
                  <p className="text-muted-foreground mt-2">
                    Run a valuation assessment to see detailed breakdown.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2">Valuation Method</h3>
                    <p>
                      {valuationMethods.find(m => m.value === latestValuation.valuationMethod)?.label || 
                        latestValuation.valuationMethod}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Assessment performed on {formatDate(latestValuation.assessmentDate)}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-2">Valuation Breakdown</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Land Value</span>
                          <span>{formatCurrency(latestValuation.landValue || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Building Value</span>
                          <span>{formatCurrency(latestValuation.buildingValue || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Improvements</span>
                          <span>{formatCurrency(latestValuation.improvementsValue || 0)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold">
                          <span>Total Assessed Value</span>
                          <span>{formatCurrency(latestValuation.assessedValue)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold mb-2">Adjustments & Factors</h3>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm font-medium">Market Value Adjustment</div>
                          <div className="flex items-center">
                            <ArrowRight className="h-4 w-4 mr-1 text-muted-foreground" />
                            <span>
                              Applied {latestValuation.marketAdjustment || 0}% 
                              {latestValuation.marketAdjustment && latestValuation.marketAdjustment > 0 ? ' increase' : ' decrease'}
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm font-medium">Exemptions Applied</div>
                          {latestValuation.exemptionAmount ? (
                            <div>{formatCurrency(latestValuation.exemptionAmount)} reduction</div>
                          ) : (
                            <div className="text-muted-foreground text-sm">None</div>
                          )}
                        </div>
                        
                        <div>
                          <div className="text-sm font-medium">Assessment Factors</div>
                          {latestValuation.valuationFactors ? (
                            <pre className="text-xs bg-muted p-2 rounded-md overflow-auto mt-1">
                              {JSON.stringify(latestValuation.valuationFactors, null, 2)}
                            </pre>
                          ) : (
                            <div className="text-muted-foreground text-sm">No additional factors</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowCalculateDialog(true)}
              >
                Recalculate Valuation
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}