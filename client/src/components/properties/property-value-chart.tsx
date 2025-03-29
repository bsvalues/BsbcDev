import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart 
} from 'recharts';
import { Property, PropertyValuation } from '@shared/schema';
import { Loader2, Calendar, ArrowLeft, ArrowRight, InfoIcon } from 'lucide-react';

// Define chart colors for multiple properties
const CHART_COLORS = [
  '#8884d8',  // Purple
  '#82ca9d',  // Green
  '#ff7300',  // Orange
  '#0088fe',  // Blue
  '#ff0000',  // Red
  '#00c49f',  // Teal
  '#ffbb28',  // Yellow
  '#ff8042',  // Coral
];

// Define time period options
type TimePeriod = 'all' | '1yr' | '3yr' | '5yr';

interface PropertyValueChartProps {
  propertyId: number;
  initialComparisonIds?: number[];
  initialMode?: 'single' | 'compare';
}

export function PropertyValueChart({ 
  propertyId,
  initialComparisonIds,
  initialMode = 'single'
}: PropertyValueChartProps) {
  const [chartType, setChartType] = useState<'area' | 'line'>('line');
  const [valueType, setValueType] = useState<'assessed' | 'market' | 'taxable'>('assessed');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
  const [activeTab, setActiveTab] = useState<'single' | 'compare'>(initialMode);
  const [comparisonProperties, setComparisonProperties] = useState<Property[]>([]);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<number[]>(
    initialComparisonIds ? [propertyId, ...initialComparisonIds.filter(id => id !== propertyId)] : [propertyId]
  );
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [showLegend, setShowLegend] = useState(true);

  // Fetch the main property's valuations
  const { data: valuations, isLoading: isLoadingMain } = useQuery({
    queryKey: ['/api/properties', propertyId, 'valuations'],
    refetchOnWindowFocus: false,
  });

  // Fetch all properties for comparison
  const { data: properties, isLoading: isLoadingProperties } = useQuery({
    queryKey: ['/api-gateway/properties'],
    refetchOnWindowFocus: false,
  });

  // Update all properties when data is loaded
  useEffect(() => {
    if (properties && Array.isArray(properties)) {
      setAllProperties(properties);
    }
  }, [properties]);

  // Fetch all comparison property valuations
  const comparisonQueries = selectedPropertyIds.filter(id => id !== propertyId).map(id => {
    return useQuery({
      queryKey: ['/api/properties', id, 'valuations'],
      refetchOnWindowFocus: false,
      enabled: activeTab === 'compare' && selectedPropertyIds.includes(id),
    });
  });

  // Check if any comparison queries are loading
  const isLoadingComparison = comparisonQueries.some(query => query.isLoading);

  // Process main property data
  const mainPropertyData = useMemo(() => {
    if (!valuations || !Array.isArray(valuations)) {
      return [];
    }

    return processValuationData(valuations, timePeriod);
  }, [valuations, timePeriod]);

  // Process comparison property data
  const comparisonData = useMemo(() => {
    if (activeTab !== 'compare' || comparisonQueries.length === 0) {
      return {};
    }

    const result: Record<number, any[]> = {};
    
    // Get the property ID for each query
    selectedPropertyIds.filter(id => id !== propertyId).forEach((id, index) => {
      const query = comparisonQueries[index];
      if (query.data && Array.isArray(query.data)) {
        result[id] = processValuationData(query.data, timePeriod);
      }
    });

    return result;
  }, [comparisonQueries, activeTab, selectedPropertyIds, propertyId, timePeriod]);

  // Merge data for chart display
  const chartData = useMemo(() => {
    if (activeTab === 'single') {
      return mainPropertyData;
    }

    // Create a map of all dates across all properties
    const dateMap: Record<string, any> = {};
    
    // Add main property dates
    mainPropertyData.forEach(item => {
      if (!dateMap[item.date]) {
        dateMap[item.date] = { 
          date: item.date, 
          rawDate: item.rawDate,
          [`property_${propertyId}`]: item[valueType]
        };
      }
    });
    
    // Add comparison property dates
    Object.entries(comparisonData).forEach(([propId, data]) => {
      data.forEach(item => {
        if (!dateMap[item.date]) {
          dateMap[item.date] = { 
            date: item.date, 
            rawDate: item.rawDate
          };
        }
        dateMap[item.date][`property_${propId}`] = item[valueType];
      });
    });
    
    // Convert back to array and sort by date
    return Object.values(dateMap).sort((a, b) => 
      new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime()
    );
  }, [mainPropertyData, comparisonData, activeTab, propertyId, valueType]);

  // Calculate trend information
  const trend = useMemo(() => {
    if (chartData.length < 2) {
      return { 
        changePercent: 0, 
        changeAmount: 0, 
        isIncrease: false 
      };
    }

    // For single property mode
    if (activeTab === 'single') {
      const firstValue = chartData[0][valueType];
      const lastValue = chartData[chartData.length - 1][valueType];
      const changeAmount = lastValue - firstValue;
      const changePercent = (changeAmount / firstValue) * 100;

      return {
        changePercent,
        changeAmount,
        isIncrease: changeAmount > 0
      };
    } 
    
    // For comparison mode - just calculate the main property
    const propertyKey = `property_${propertyId}`;
    const firstValue = chartData[0][propertyKey];
    const lastValue = chartData[chartData.length - 1][propertyKey];
    
    if (firstValue === undefined || lastValue === undefined) {
      return { 
        changePercent: 0, 
        changeAmount: 0, 
        isIncrease: false 
      };
    }

    const changeAmount = lastValue - firstValue;
    const changePercent = (changeAmount / firstValue) * 100;

    return {
      changePercent,
      changeAmount,
      isIncrease: changeAmount > 0
    };
  }, [chartData, valueType, activeTab, propertyId]);

  // Format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Toggle property selection for comparison
  const togglePropertySelection = (property: Property) => {
    if (selectedPropertyIds.includes(property.id)) {
      // Remove from selection
      setSelectedPropertyIds(selectedPropertyIds.filter(id => id !== property.id));
    } else {
      // Add to selection (limit to 5 total properties)
      if (selectedPropertyIds.length < 5) {
        setSelectedPropertyIds([...selectedPropertyIds, property.id]);
      }
    }
  };

  // Find property name by ID
  const getPropertyNameById = (id: number) => {
    const property = allProperties.find(p => p.id === id);
    return property ? property.address : `Property #${id}`;
  };

  // Process valuation data with time period filter
  function processValuationData(valuations: PropertyValuation[], period: TimePeriod) {
    // Sort by date
    const sorted = [...valuations].sort((a, b) => {
      return new Date(a.assessmentDate).getTime() - new Date(b.assessmentDate).getTime();
    });
    
    // Apply time period filter
    let filtered = sorted;
    if (period !== 'all') {
      const now = new Date();
      const yearsToSubtract = period === '1yr' ? 1 : period === '3yr' ? 3 : 5;
      const cutoffDate = new Date(now.setFullYear(now.getFullYear() - yearsToSubtract));
      
      filtered = sorted.filter(v => new Date(v.assessmentDate) >= cutoffDate);
    }
    
    // Map to chart format
    return filtered.map((valuation) => {
      const date = new Date(valuation.assessmentDate);
      const formattedDate = date.toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      });

      return {
        date: formattedDate,
        rawDate: date,
        assessed: valuation.assessedValue,
        market: valuation.marketValue,
        taxable: valuation.taxableValue,
      };
    });
  }

  // Loading state
  if (isLoadingMain || (activeTab === 'compare' && isLoadingComparison) || isLoadingProperties) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Property Value Trends</CardTitle>
          <CardDescription>Loading historical property value data...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const valueLabel = valueType === 'assessed' ? 'Assessed Value' : 
                     valueType === 'market' ? 'Market Value' : 'Taxable Value';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
          <div>
            <CardTitle>Property Value Trends</CardTitle>
            <CardDescription>Historical property value analysis</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
              <TabsList>
                <TabsTrigger value="single">Single Property</TabsTrigger>
                <TabsTrigger value="compare">Compare Properties</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 justify-between mb-4">
          {/* Controls */}
          <div className="flex flex-wrap gap-2">
            <Select value={valueType} onValueChange={(value: any) => setValueType(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Value Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assessed">Assessed Value</SelectItem>
                <SelectItem value="market">Market Value</SelectItem>
                <SelectItem value="taxable">Taxable Value</SelectItem>
              </SelectContent>
            </Select>
            <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Chart Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line Chart</SelectItem>
                <SelectItem value="area">Area Chart</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timePeriod} onValueChange={(value: any) => setTimePeriod(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Time Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="1yr">Last Year</SelectItem>
                <SelectItem value="3yr">Last 3 Years</SelectItem>
                <SelectItem value="5yr">Last 5 Years</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowLegend(!showLegend)}
            >
              {showLegend ? 'Hide Legend' : 'Show Legend'}
            </Button>
          </div>
        </div>

        {/* Property comparison selector (only shown in compare mode) */}
        {activeTab === 'compare' && (
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">Select properties to compare (max 5):</h3>
            <div className="bg-muted/30 p-3 rounded-md max-h-[150px] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {allProperties.map(property => (
                  <div key={property.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`property-${property.id}`}
                      checked={selectedPropertyIds.includes(property.id)}
                      onCheckedChange={() => togglePropertySelection(property)}
                      disabled={!selectedPropertyIds.includes(property.id) && selectedPropertyIds.length >= 5}
                    />
                    <label 
                      htmlFor={`property-${property.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {property.address}
                      {property.id === propertyId && (
                        <Badge variant="outline" className="ml-2">Current</Badge>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {chartData.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground">No valuation history available for the selected time period</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <div className="flex flex-col md:flex-row md:justify-between md:items-end">
                <div>
                  <h3 className="text-lg font-semibold">{valueLabel} History</h3>
                  <p className="text-muted-foreground text-sm">
                    <Calendar className="inline-block mr-1 h-3 w-3" />
                    Showing data from {chartData[0].date} to {chartData[chartData.length - 1].date}
                  </p>
                </div>
                {activeTab === 'single' && (
                  <div className="mt-2 md:mt-0">
                    <p className="text-sm">
                      Overall change: 
                      <span className={`font-semibold ml-1 ${trend.isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                        {trend.isIncrease ? '+' : ''}{trend.changePercent.toFixed(1)}% 
                        ({formatCurrency(trend.changeAmount)})
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="h-64 md:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {activeTab === 'single' ? (
                  /* Single property chart */
                  chartType === 'area' ? (
                    <AreaChart
                      data={chartData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                    >
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        height={50}
                      />
                      <YAxis 
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 12 }}
                        width={80}
                      />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), valueLabel]}
                        labelFormatter={(date) => `Date: ${date}`}
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '6px', border: 'none', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey={valueType} 
                        stroke="#8884d8" 
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                        name={valueLabel}
                      />
                    </AreaChart>
                  ) : (
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        height={50}
                      />
                      <YAxis 
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 12 }}
                        width={80}
                      />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), valueLabel]}
                        labelFormatter={(date) => `Date: ${date}`}
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '6px', border: 'none', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)' }}
                      />
                      {showLegend && <Legend verticalAlign="bottom" height={36} />}
                      <Line 
                        type="monotone" 
                        dataKey={valueType} 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        name={valueLabel}
                      />
                    </LineChart>
                  )
                ) : (
                  /* Multiple property comparison chart */
                  chartType === 'area' ? (
                    <AreaChart
                      data={chartData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        height={50}
                      />
                      <YAxis 
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 12 }}
                        width={80}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => {
                          const propId = parseInt(name.split('_')[1]);
                          return [formatCurrency(value), getPropertyNameById(propId)];
                        }}
                        labelFormatter={(date) => `Date: ${date}`}
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '6px', border: 'none', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)' }}
                      />
                      {showLegend && <Legend verticalAlign="bottom" height={36} 
                        formatter={(value, entry) => {
                          const propId = parseInt(value.split('_')[1]);
                          return getPropertyNameById(propId);
                        }}
                      />}
                      {selectedPropertyIds.map((id, index) => {
                        const propKey = `property_${id}`;
                        const color = CHART_COLORS[index % CHART_COLORS.length];
                        
                        // Define gradient
                        const gradientId = `color${id}`;
                        return (
                          <React.Fragment key={id}>
                            <defs>
                              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                                <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
                              </linearGradient>
                            </defs>
                            <Area
                              type="monotone"
                              dataKey={propKey}
                              stroke={color}
                              fillOpacity={0.7}
                              fill={`url(#${gradientId})`}
                              name={propKey}
                              stackId={chartType === 'area' ? "1" : undefined}
                            />
                          </React.Fragment>
                        );
                      })}
                    </AreaChart>
                  ) : (
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        height={50}
                      />
                      <YAxis 
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 12 }}
                        width={80}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => {
                          const propId = parseInt(name.split('_')[1]);
                          return [formatCurrency(value), getPropertyNameById(propId)];
                        }}
                        labelFormatter={(date) => `Date: ${date}`}
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '6px', border: 'none', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)' }}
                      />
                      {showLegend && <Legend verticalAlign="bottom" height={36} 
                        formatter={(value, entry) => {
                          const propId = parseInt(value.split('_')[1]);
                          return getPropertyNameById(propId);
                        }}
                      />}
                      {selectedPropertyIds.map((id, index) => {
                        const propKey = `property_${id}`;
                        const color = CHART_COLORS[index % CHART_COLORS.length];
                        
                        return (
                          <Line
                            key={id}
                            type="monotone"
                            dataKey={propKey}
                            stroke={color}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                            name={propKey}
                          />
                        );
                      })}
                    </LineChart>
                  )
                )}
              </ResponsiveContainer>
            </div>
          </>
        )}
        
        {/* Insights section */}
        {chartData.length > 0 && (
          <div className="mt-6 bg-muted/30 p-4 rounded-md flex gap-2">
            <InfoIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-sm">Chart Insights</h4>
              <p className="text-sm text-muted-foreground">
                {activeTab === 'single' 
                  ? `This property has shown ${trend.isIncrease ? 'an increase' : 'a decrease'} of ${Math.abs(trend.changePercent).toFixed(1)}% (${formatCurrency(Math.abs(trend.changeAmount))}) in ${valueLabel.toLowerCase()} over the displayed period.` 
                  : `You're comparing ${selectedPropertyIds.length} properties. Use the legend and hovering to see details for each property. ` + 
                    `${selectedPropertyIds.length > 2 ? 'Toggle the legend items to focus on specific properties.' : ''}`
                }
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}