import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart 
} from 'recharts';
import { PropertyValuation } from '@shared/schema';
import { Loader2 } from 'lucide-react';

interface PropertyValueChartProps {
  propertyId: number;
}

export function PropertyValueChart({ propertyId }: PropertyValueChartProps) {
  const [chartType, setChartType] = useState<'area' | 'line'>('area');
  const [valueType, setValueType] = useState<'assessed' | 'market' | 'taxable'>('assessed');

  const { data: valuations, isLoading } = useQuery({
    queryKey: ['/api/properties', propertyId, 'valuations'],
    refetchOnWindowFocus: false,
  });

  const chartData = useMemo(() => {
    if (!valuations || !Array.isArray(valuations)) {
      return [];
    }

    return valuations
      .sort((a: PropertyValuation, b: PropertyValuation) => {
        // Sort by assessment date
        return new Date(a.assessmentDate).getTime() - new Date(b.assessmentDate).getTime();
      })
      .map((valuation: PropertyValuation) => {
        // Format the date for display
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
  }, [valuations]);

  // Calculate trend information
  const trend = useMemo(() => {
    if (chartData.length < 2) {
      return { 
        changePercent: 0, 
        changeAmount: 0, 
        isIncrease: false 
      };
    }

    const firstValue = chartData[0][valueType];
    const lastValue = chartData[chartData.length - 1][valueType];
    const changeAmount = lastValue - firstValue;
    const changePercent = (changeAmount / firstValue) * 100;

    return {
      changePercent,
      changeAmount,
      isIncrease: changeAmount > 0
    };
  }, [chartData, valueType]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
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
          <div className="flex gap-2">
            <Select value={valueType} onValueChange={(value: any) => setValueType(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Value Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assessed">Assessed Value</SelectItem>
                <SelectItem value="market">Market Value</SelectItem>
                <SelectItem value="taxable">Taxable Value</SelectItem>
              </SelectContent>
            </Select>
            <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Chart Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="area">Area Chart</SelectItem>
                <SelectItem value="line">Line Chart</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground">No valuation history available</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <div className="flex flex-col md:flex-row md:justify-between md:items-end">
                <div>
                  <h3 className="text-lg font-semibold">{valueLabel} History</h3>
                  <p className="text-muted-foreground text-sm">
                    Showing data from {chartData[0].date} to {chartData[chartData.length - 1].date}
                  </p>
                </div>
                <div className="mt-2 md:mt-0">
                  <p className="text-sm">
                    Overall change: 
                    <span className={`font-semibold ml-1 ${trend.isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                      {trend.isIncrease ? '+' : ''}{trend.changePercent.toFixed(1)}% 
                      ({formatCurrency(trend.changeAmount)})
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), valueLabel]}
                      labelFormatter={(date) => `Date: ${date}`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey={valueType} 
                      stroke="#8884d8" 
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                    />
                  </AreaChart>
                ) : (
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), valueLabel]}
                      labelFormatter={(date) => `Date: ${date}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey={valueType} 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}