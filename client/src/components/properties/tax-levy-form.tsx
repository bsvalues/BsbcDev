import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Calculator, Calendar, Download, FileText, CreditCard, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

interface TaxLevyFormProps {
  propertyId: number;
}

export function TaxLevyForm({ propertyId }: TaxLevyFormProps) {
  const [activeTaxYear, setActiveTaxYear] = useState(new Date().getFullYear());

  // Fetch property details and valuation (if any)
  const { data: property, isLoading: isPropertyLoading } = useQuery({
    queryKey: [`/api-gateway/properties/${propertyId}`],
    refetchOnWindowFocus: false,
  });

  // Fetch property valuations
  const { data: valuations, isLoading: isValuationsLoading } = useQuery({
    queryKey: [`/api-gateway/properties/${propertyId}/valuations`],
    refetchOnWindowFocus: false,
  });

  // Fetch tax rates
  const { data: taxRates, isLoading: isTaxRatesLoading } = useQuery({
    queryKey: ['/api-gateway/properties/tax-rates'],
    refetchOnWindowFocus: false,
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

  // Get the relevant tax rate for the property
  const getPropertyTaxRate = () => {
    if (!property || !taxRates) return null;
    
    return taxRates.find(rate => 
      rate.propertyType === property.propertyType && 
      rate.zoneCode === property.zoneCode &&
      rate.taxYear === activeTaxYear
    );
  };

  // Get the latest valuation for the property
  const getLatestValuation = () => {
    if (!valuations || valuations.length === 0) return null;
    
    return valuations.sort((a, b) => 
      new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime()
    )[0];
  };

  // Calculate tax amount based on tax rate and taxable value
  const calculateTaxAmount = () => {
    const taxRate = getPropertyTaxRate();
    const valuation = getLatestValuation();
    
    if (!taxRate || !valuation) return 0;
    
    // Millage rate is per $1000 of taxable value
    return (valuation.taxableValue / 1000) * taxRate.millageRate;
  };

  // Generate mock payment dates (for demonstration purposes)
  const getPaymentDueDates = () => {
    const year = activeTaxYear;
    return [
      new Date(`${year}-01-31`),
      new Date(`${year}-04-30`),
      new Date(`${year}-07-31`),
      new Date(`${year}-10-31`)
    ];
  };

  // Mock payment status (this would come from the API)
  const getPaymentInstallments = () => {
    const totalTax = calculateTaxAmount();
    const installmentAmount = totalTax / 4;
    const dueDates = getPaymentDueDates();
    
    // Mock data - in real application this would come from API
    return [
      { 
        id: 1, 
        dueDate: dueDates[0], 
        amount: installmentAmount, 
        status: 'paid', 
        paidDate: new Date(`${activeTaxYear}-01-15`),
        paidAmount: installmentAmount
      },
      { 
        id: 2, 
        dueDate: dueDates[1], 
        amount: installmentAmount, 
        status: activeTaxYear < new Date().getFullYear() || 
               (activeTaxYear === new Date().getFullYear() && new Date() > dueDates[1]) 
                ? 'paid' : 'pending',
        paidDate: activeTaxYear < new Date().getFullYear() || 
                  (activeTaxYear === new Date().getFullYear() && new Date() > dueDates[1])
                   ? new Date(`${activeTaxYear}-04-15`) : null,
        paidAmount: activeTaxYear < new Date().getFullYear() || 
                    (activeTaxYear === new Date().getFullYear() && new Date() > dueDates[1]) 
                     ? installmentAmount : null
      },
      { 
        id: 3, 
        dueDate: dueDates[2], 
        amount: installmentAmount, 
        status: activeTaxYear < new Date().getFullYear() ? 'paid' : 'pending',
        paidDate: activeTaxYear < new Date().getFullYear() ? new Date(`${activeTaxYear}-07-15`) : null,
        paidAmount: activeTaxYear < new Date().getFullYear() ? installmentAmount : null
      },
      { 
        id: 4, 
        dueDate: dueDates[3], 
        amount: installmentAmount, 
        status: activeTaxYear < new Date().getFullYear() ? 'paid' : 'pending',
        paidDate: activeTaxYear < new Date().getFullYear() ? new Date(`${activeTaxYear}-10-15`) : null,
        paidAmount: activeTaxYear < new Date().getFullYear() ? installmentAmount : null
      }
    ];
  };

  // Calculate payment progress percentage
  const getPaymentProgressPercentage = () => {
    const installments = getPaymentInstallments();
    const paidCount = installments.filter(inst => inst.status === 'paid').length;
    return (paidCount / installments.length) * 100;
  };

  // Tax bill years available (would come from API)
  const taxYears = [
    new Date().getFullYear(),
    new Date().getFullYear() - 1,
    new Date().getFullYear() - 2
  ];

  if (isPropertyLoading || isValuationsLoading || isTaxRatesLoading) {
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

  const taxRate = getPropertyTaxRate();
  const latestValuation = getLatestValuation();
  const taxAmount = calculateTaxAmount();
  const installments = getPaymentInstallments();
  const paymentProgress = getPaymentProgressPercentage();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tax Levy Information</h2>
        
        <Select onValueChange={(value) => setActiveTaxYear(parseInt(value))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={`Tax Year ${activeTaxYear}`} />
          </SelectTrigger>
          <SelectContent>
            {taxYears.map(year => (
              <SelectItem key={year} value={year.toString()}>
                Tax Year {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!latestValuation || !taxRate ? (
        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="text-center py-6">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                {!latestValuation 
                  ? "Property Not Yet Assessed" 
                  : "Tax Rate Not Available"}
              </h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                {!latestValuation 
                  ? "This property needs to be assessed before tax information can be calculated. Please complete a property valuation first."
                  : `No tax rate information is available for this property type in tax year ${activeTaxYear}.`}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Annual Tax Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(taxAmount)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on {latestValuation.taxableValue.toLocaleString()} taxable value
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tax Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {taxRate.millageRate} mills
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  ${taxRate.millageRate} per $1,000 of taxable value
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Payment Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">
                      {installments.filter(i => i.status === 'paid').length} of {installments.length} paid
                    </span>
                    <span className="text-sm">
                      {Math.round(paymentProgress)}%
                    </span>
                  </div>
                  <Progress value={paymentProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {paymentProgress < 100 
                      ? `Next installment due: ${formatDate(installments.find(i => i.status === 'pending')?.dueDate || new Date())}`
                      : 'All payments completed for the year'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="installments">
            <TabsList>
              <TabsTrigger value="installments">Payment Schedule</TabsTrigger>
              <TabsTrigger value="details">Tax Bill Details</TabsTrigger>
            </TabsList>
            
            <TabsContent value="installments" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Schedule</CardTitle>
                  <CardDescription>
                    Quarterly tax payment installments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Installment</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {installments.map((installment) => (
                        <TableRow key={installment.id}>
                          <TableCell>
                            Q{installment.id}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                              {formatDate(installment.dueDate)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(installment.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={installment.status === 'paid' ? 'default' : 'outline'}
                              className="flex items-center gap-1 w-fit"
                            >
                              {installment.status === 'paid' ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <Clock className="h-3 w-3" />
                              )}
                              {installment.status === 'paid' ? 'Paid' : 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {installment.paidDate ? formatDate(installment.paidDate) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
                <CardFooter className="flex justify-end space-x-2">
                  <Button variant="outline" className="gap-1">
                    <FileText className="h-4 w-4" />
                    View Bill
                  </Button>
                  <Button className="gap-1">
                    <CreditCard className="h-4 w-4" />
                    Make Payment
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="details" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Tax Bill Details</CardTitle>
                  <CardDescription>
                    Detailed breakdown of tax calculation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold mb-2">Property Assessment</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Assessed Value</span>
                            <span>{formatCurrency(latestValuation.assessedValue)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Taxable Value</span>
                            <span>{formatCurrency(latestValuation.taxableValue)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Assessment Date</span>
                            <span>{formatDate(latestValuation.assessmentDate)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold mb-2">Applied Tax Rate</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Base Rate</span>
                            <span>{taxRate.millageRate} mills</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Special Assessments</span>
                            <span>
                              {taxRate.specialAssessments ? 
                                Object.keys(taxRate.specialAssessments).length + ' items' : 
                                'None'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tax Year</span>
                            <span>{taxRate.taxYear}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="font-semibold mb-2">Tax Calculation</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Taxable Value</span>
                          <span>{formatCurrency(latestValuation.taxableValue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>× Rate per $1,000</span>
                          <span>{taxRate.millageRate} mills</span>
                        </div>
                        {taxRate.exemptionAmount > 0 && (
                          <div className="flex justify-between">
                            <span>− Exemptions</span>
                            <span>{formatCurrency(taxRate.exemptionAmount)}</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-bold">
                          <span>Annual Tax Amount</span>
                          <span>{formatCurrency(taxAmount)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold mb-2">Tax Distribution</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>County Operations</span>
                          <span>{formatCurrency(taxAmount * 0.35)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Education</span>
                          <span>{formatCurrency(taxAmount * 0.45)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>City Services</span>
                          <span>{formatCurrency(taxAmount * 0.15)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Special Districts</span>
                          <span>{formatCurrency(taxAmount * 0.05)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end space-x-2">
                  <Button variant="outline" className="gap-1">
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

// Missing import for Select component
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';