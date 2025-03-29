import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, RefreshCw, Building, FileText, Calculator, ArrowUpRight, LineChart } from 'lucide-react';
import { Property } from '@shared/schema';
import { PropertyForm } from '@/components/properties/property-form';
import { PropertyList } from '@/components/properties/property-list';
import { PropertyDetail } from '@/components/properties/property-detail';
import { PropertyValuation } from '@/components/properties/property-valuation';
import { PropertyValueChart } from '@/components/properties/property-value-chart';
import { TaxLevyForm } from '@/components/properties/tax-levy-form';
import Sidebar from "@/components/ui/sidebar";

export default function PropertiesPage() {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: properties, isLoading, refetch } = useQuery({
    queryKey: ['/api-gateway/properties'],
    refetchOnWindowFocus: false,
  });

  // Check mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property);
    setActiveTab('detail');
  };

  const handleAddPropertyClick = () => {
    setIsAddingProperty(true);
    setActiveTab('add');
  };

  const handleBackToList = () => {
    setSelectedProperty(null);
    setIsAddingProperty(false);
    setActiveTab('list');
  };

  const handlePropertyAdded = () => {
    refetch();
    setIsAddingProperty(false);
    setActiveTab('list');
  };

  return (
    <div className="flex h-screen">
      {isMobile ? (
        <div className={`md:hidden fixed top-0 left-0 z-20 ${sidebarOpen ? 'block' : 'hidden'}`}>
          <Sidebar 
            isMobile={isMobile} 
            isOpen={sidebarOpen} 
            toggleSidebar={toggleSidebar} 
          />
        </div>
      ) : (
        <Sidebar 
          isMobile={isMobile} 
          isOpen={true} 
          toggleSidebar={toggleSidebar} 
        />
      )}
      
      {/* Mobile sidebar toggle */}
      <div className="md:hidden fixed top-4 left-4 z-10">
        <button 
          id="sidebarToggle" 
          className="bg-primary rounded-md p-2 text-white"
          onClick={toggleSidebar}
        >
          <i className="fas fa-bars"></i>
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <header className="bg-white shadow-sm py-4 px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="md:hidden w-6"></div>
          <h2 className="text-xl font-semibold text-dark">Property Management</h2>
          <div className="flex items-center space-x-4">
            <span className="bg-success text-white px-3 py-1 rounded-full text-xs">Development Mode</span>
          </div>
        </header>
        
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Property Tax Valuation System</h1>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="gap-1"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button
                size="sm" 
                onClick={handleAddPropertyClick}
                className="gap-1"
              >
                <PlusCircle className="h-4 w-4" />
                Add Property
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-6 w-full max-w-3xl">
              <TabsTrigger value="list" className="flex items-center gap-1">
                <Building className="h-4 w-4" />
                Properties
              </TabsTrigger>
              <TabsTrigger value="detail" disabled={!selectedProperty} className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="valuation" disabled={!selectedProperty} className="flex items-center gap-1">
                <Calculator className="h-4 w-4" />
                Valuation
              </TabsTrigger>
              <TabsTrigger value="trends" disabled={!selectedProperty} className="flex items-center gap-1">
                <LineChart className="h-4 w-4" />
                Trends
              </TabsTrigger>
              <TabsTrigger value="tax-levy" disabled={!selectedProperty} className="flex items-center gap-1">
                <ArrowUpRight className="h-4 w-4" />
                Tax Levy
              </TabsTrigger>
              <TabsTrigger value="add" disabled={!isAddingProperty} className="flex items-center gap-1">
                <PlusCircle className="h-4 w-4" />
                Add New
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Your Properties</CardTitle>
                  <CardDescription>
                    View and manage all your registered properties
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PropertyList 
                    properties={properties || []} 
                    isLoading={isLoading} 
                    onPropertySelect={handlePropertySelect}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="detail" className="mt-6">
              {selectedProperty && (
                <Card>
                  <CardHeader>
                    <CardTitle>Property Details</CardTitle>
                    <CardDescription>
                      Detailed information about the selected property
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PropertyDetail 
                      property={selectedProperty}
                      onBack={handleBackToList}
                    />
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={handleBackToList}>
                      Back to Properties
                    </Button>
                    <Button onClick={() => setActiveTab('valuation')}>
                      View Valuation
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="valuation" className="mt-6">
              {selectedProperty && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Property Valuation</CardTitle>
                      <CardDescription>
                        Valuation details and assessment history
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <PropertyValuation 
                        propertyId={selectedProperty.id}
                      />
                    </CardContent>
                  </Card>
                  
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setActiveTab('detail')}>
                      Back to Details
                    </Button>
                    <Button onClick={() => setActiveTab('trends')}>
                      View Value Trends
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="trends" className="mt-6">
              {selectedProperty && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Value Trends Analysis</CardTitle>
                      <CardDescription>
                        Historical property value trends and comparisons
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-6">
                        View historical property value data and analyze trends over time. This information can help in tax planning and property investment decisions.
                      </p>
                      
                      <PropertyValueChart propertyId={selectedProperty.id} />
                    </CardContent>
                  </Card>
                  
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setActiveTab('valuation')}>
                      Back to Valuation
                    </Button>
                    <Button onClick={() => setActiveTab('tax-levy')}>
                      View Tax Levy
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tax-levy" className="mt-6">
              {selectedProperty && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tax Levy Information</CardTitle>
                    <CardDescription>
                      Tax calculations and payment schedule
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TaxLevyForm 
                      propertyId={selectedProperty.id}
                    />
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" onClick={() => setActiveTab('valuation')}>
                      Back to Valuation
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="add" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Add New Property</CardTitle>
                  <CardDescription>
                    Register a new property in the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PropertyForm 
                    onSuccess={handlePropertyAdded} 
                    onCancel={handleBackToList}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}