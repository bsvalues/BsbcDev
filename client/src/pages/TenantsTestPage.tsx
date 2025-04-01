import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
}

interface IsolationTestResult {
  success: boolean;
  results: TestResult[];
}

interface ResourceLimitsTestResult {
  success: boolean;
  results: TestResult[];
}

interface AllTestsResult {
  success: boolean;
  results: {
    creation: boolean;
    isolation: boolean;
    resourceLimits: boolean;
    accessControl: boolean;
    summary: string;
  };
}

const TenantsTestPage: React.FC = () => {
  const { toast } = useToast();
  const [testProgress, setTestProgress] = useState(0);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [activeTab, setActiveTab] = useState('creation');
  
  // Form state for tenant creation test
  const [tenantData, setTenantData] = useState({
    name: '',
    domain: '',
    plan: 'basic'
  });

  // Creation test mutation
  const creationTestMutation = useMutation({
    mutationFn: (data: typeof tenantData) => 
      apiRequest<any>('/api/tenants/test/create', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({
        title: 'Tenant Creation Test Complete',
        description: 'The tenant creation test has been executed successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Test Error',
        description: error.message || 'There was an error running the tenant creation test.',
        variant: 'destructive',
      });
    }
  });

  // Isolation test mutation
  const isolationTestMutation = useMutation({
    mutationFn: () => 
      apiRequest<IsolationTestResult>('/api/tenants/test/isolation', {
        method: 'POST'
      }),
    onSuccess: () => {
      toast({
        title: 'Tenant Isolation Test Complete',
        description: 'The tenant isolation test has been executed successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Test Error',
        description: error.message || 'There was an error running the tenant isolation test.',
        variant: 'destructive',
      });
    }
  });

  // Resource limits test mutation
  const resourceLimitsTestMutation = useMutation({
    mutationFn: () => 
      apiRequest<ResourceLimitsTestResult>('/api/tenants/test/resource-limits', {
        method: 'POST'
      }),
    onSuccess: () => {
      toast({
        title: 'Resource Limits Test Complete',
        description: 'The resource limits test has been executed successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Test Error',
        description: error.message || 'There was an error running the resource limits test.',
        variant: 'destructive',
      });
    }
  });

  // Run all tests mutation
  const allTestsMutation = useMutation({
    mutationFn: () => 
      apiRequest<AllTestsResult>('/api/tenants/test/all', {
        method: 'POST'
      }),
    onSuccess: () => {
      toast({
        title: 'All Tests Complete',
        description: 'All tenant tests have been executed successfully.',
      });
      setTestProgress(100);
      setIsRunningTest(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Test Error',
        description: error.message || 'There was an error running the tenant tests.',
        variant: 'destructive',
      });
      setIsRunningTest(false);
    }
  });

  // Cleanup test resources mutation
  const cleanupMutation = useMutation({
    mutationFn: () => 
      apiRequest<any>('/api/tenants/test/cleanup', {
        method: 'POST'
      }),
    onSuccess: () => {
      toast({
        title: 'Cleanup Complete',
        description: 'Test resources have been cleaned up successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Cleanup Error',
        description: error.message || 'There was an error cleaning up test resources.',
        variant: 'destructive',
      });
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTenantData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    creationTestMutation.mutate(tenantData);
  };

  const handleIsolationTest = () => {
    isolationTestMutation.mutate();
  };

  const handleResourceLimitsTest = () => {
    resourceLimitsTestMutation.mutate();
  };

  const handleRunAllTests = () => {
    setIsRunningTest(true);
    setTestProgress(0);
    
    // Simulate progress updates
    const intervalId = setInterval(() => {
      setTestProgress(prev => {
        const newProgress = prev + 5;
        if (newProgress >= 90) {
          clearInterval(intervalId);
          return 90;
        }
        return newProgress;
      });
    }, 300);
    
    allTestsMutation.mutate();
  };

  const handleCleanup = () => {
    cleanupMutation.mutate();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Multi-Tenant Testing</h1>
      <p className="text-gray-600 mb-8">
        This page allows you to run tests that verify the multi-tenant functionality of the BSBC platform,
        including tenant creation, isolation, and resource limits.
      </p>

      <div className="mb-8">
        <Button 
          onClick={handleRunAllTests} 
          size="lg" 
          className="mr-4"
          disabled={isRunningTest || allTestsMutation.isPending}
        >
          Run All Tests
        </Button>
        <Button 
          onClick={handleCleanup} 
          variant="outline" 
          disabled={cleanupMutation.isPending}
        >
          Cleanup Test Resources
        </Button>
      </div>

      {isRunningTest && (
        <div className="mb-8">
          <p className="mb-2">Running all tenant tests...</p>
          <Progress value={testProgress} className="w-full" />
        </div>
      )}

      {allTestsMutation.isSuccess && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>
              {allTestsMutation.data.success ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="mr-2" /> All Tests Passed
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <XCircle className="mr-2" /> Some Tests Failed
                </div>
              )}
            </CardTitle>
            <CardDescription>Summary of all tenant tests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-8">
                  {allTestsMutation.data.results.creation ? (
                    <CheckCircle className="text-green-600" />
                  ) : (
                    <XCircle className="text-red-600" />
                  )}
                </div>
                <div className="flex-1">Tenant Creation</div>
              </div>
              <div className="flex items-center">
                <div className="w-8">
                  {allTestsMutation.data.results.isolation ? (
                    <CheckCircle className="text-green-600" />
                  ) : (
                    <XCircle className="text-red-600" />
                  )}
                </div>
                <div className="flex-1">Tenant Isolation</div>
              </div>
              <div className="flex items-center">
                <div className="w-8">
                  {allTestsMutation.data.results.resourceLimits ? (
                    <CheckCircle className="text-green-600" />
                  ) : (
                    <XCircle className="text-red-600" />
                  )}
                </div>
                <div className="flex-1">Resource Limits</div>
              </div>
              <div className="flex items-center">
                <div className="w-8">
                  {allTestsMutation.data.results.accessControl ? (
                    <CheckCircle className="text-green-600" />
                  ) : (
                    <XCircle className="text-red-600" />
                  )}
                </div>
                <div className="flex-1">Access Control</div>
              </div>
            </div>
            <Separator className="my-4" />
            <p className="font-medium">{allTestsMutation.data.results.summary}</p>
          </CardContent>
        </Card>
      )}

      <Tabs 
        defaultValue="creation" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="mt-8"
      >
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="creation">Tenant Creation</TabsTrigger>
          <TabsTrigger value="isolation">Tenant Isolation</TabsTrigger>
          <TabsTrigger value="resource-limits">Resource Limits</TabsTrigger>
        </TabsList>

        <TabsContent value="creation">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Creation Test</CardTitle>
              <CardDescription>Test tenant creation functionality</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTest}>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="name">Tenant Name</Label>
                    <Input 
                      id="name"
                      name="name"
                      placeholder="Test Tenant"
                      value={tenantData.name}
                      onChange={handleInputChange}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="domain">Domain</Label>
                    <Input 
                      id="domain"
                      name="domain"
                      placeholder="test-tenant.bsbc.local"
                      value={tenantData.domain}
                      onChange={handleInputChange}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="plan">Plan</Label>
                    <select
                      id="plan"
                      name="plan"
                      value={tenantData.plan}
                      onChange={(e) => setTenantData(prev => ({ ...prev, plan: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="free">Free Trial</option>
                      <option value="basic">Basic</option>
                      <option value="premium">Premium</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                </div>
              </form>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleCreateTest} 
                disabled={creationTestMutation.isPending}
              >
                Run Tenant Creation Test
              </Button>
            </CardFooter>
          </Card>

          {creationTestMutation.isSuccess && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>
                  {creationTestMutation.data.success ? (
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="mr-2" /> Test Passed
                    </div>
                  ) : (
                    <div className="flex items-center text-red-600">
                      <XCircle className="mr-2" /> Test Failed
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {creationTestMutation.data.success ? (
                  <p>Successfully created tenant with ID: {creationTestMutation.data.tenantId}</p>
                ) : (
                  <p>Error: {creationTestMutation.data.error}</p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="isolation">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Isolation Test</CardTitle>
              <CardDescription>Test tenant data isolation and access control</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                This test verifies that data is properly isolated between tenants.
                It will create test tenants, populate them with data, and verify that 
                one tenant cannot access another tenant's data.
              </p>
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Note</AlertTitle>
                <AlertDescription>
                  This test may take a few moments to complete as it creates multiple test resources.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleIsolationTest} 
                disabled={isolationTestMutation.isPending}
              >
                Run Isolation Test
              </Button>
            </CardFooter>
          </Card>

          {isolationTestMutation.isSuccess && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>
                  {isolationTestMutation.data.success ? (
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="mr-2" /> Isolation Tests Passed
                    </div>
                  ) : (
                    <div className="flex items-center text-red-600">
                      <XCircle className="mr-2" /> Isolation Tests Failed
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isolationTestMutation.data.results.map((result: TestResult, index: number) => (
                    <div key={index} className="flex items-start pb-4 border-b last:border-b-0">
                      <div className="mt-0.5 mr-3">
                        {result.passed ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{result.testName}</p>
                        <p className="text-sm text-gray-600">{result.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="resource-limits">
          <Card>
            <CardHeader>
              <CardTitle>Resource Limits Test</CardTitle>
              <CardDescription>Test plan-based resource limits</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                This test verifies that tenants are limited to the resources allowed by their subscription plan.
                It will create a test tenant with a basic plan and attempt to create more resources than allowed.
              </p>
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Note</AlertTitle>
                <AlertDescription>
                  This test creates multiple properties for a test tenant to verify resource limits.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleResourceLimitsTest} 
                disabled={resourceLimitsTestMutation.isPending}
              >
                Run Resource Limits Test
              </Button>
            </CardFooter>
          </Card>

          {resourceLimitsTestMutation.isSuccess && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>
                  {resourceLimitsTestMutation.data.success ? (
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="mr-2" /> Resource Limits Tests Passed
                    </div>
                  ) : (
                    <div className="flex items-center text-red-600">
                      <XCircle className="mr-2" /> Resource Limits Tests Failed
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {resourceLimitsTestMutation.data.results.map((result: TestResult, index: number) => (
                    <div key={index} className="flex items-start pb-4 border-b last:border-b-0">
                      <div className="mt-0.5 mr-3">
                        {result.passed ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{result.testName}</p>
                        <p className="text-sm text-gray-600">{result.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TenantsTestPage;