import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function MultiTenantSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [tenantStrategy, setTenantStrategy] = useState("database");
  const [subdomainRouting, setSubdomainRouting] = useState(true);
  const [pathRouting, setPathRouting] = useState(false);
  const [headerRouting, setHeaderRouting] = useState(false);
  
  const [tenantName, setTenantName] = useState("Test Company");
  const [domainIdentifier, setDomainIdentifier] = useState("testcompany");
  const [adminEmail, setAdminEmail] = useState("admin@testcompany.com");
  const [plan, setPlan] = useState("Free Trial");
  
  const { data: tenants = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/tenants"],
  });
  
  const createTenantMutation = useMutation({
    mutationFn: async (tenantData: any) => {
      const response = await apiRequest("POST", "/api/tenants", tenantData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      toast({
        title: "Tenant Created",
        description: "New tenant has been created successfully",
        variant: "default",
      });
      
      // Move to next section after successful tenant creation
      setTimeout(() => {
        window.location.hash = "subscriptions";
      }, 1000);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create tenant",
        variant: "destructive",
      });
    }
  });
  
  const handleCreateTenant = () => {
    createTenantMutation.mutate({
      name: tenantName,
      domain: `${domainIdentifier}.bsbc.local`,
      plan: plan.toLowerCase().replace(' ', '_'),
      status: "active",
      adminEmail
    });
  };

  return (
    <section id="tenants" className="mb-8">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">Multi-Tenant Setup</h2>
        <p className="mb-4">Configure and test the multi-tenant functionality.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-3">Tenant Isolation Strategy</h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <input 
                  type="radio" 
                  id="strategy1" 
                  name="tenantStrategy" 
                  className="w-4 h-4 text-primary focus:ring-primary" 
                  checked={tenantStrategy === "database"}
                  onChange={() => setTenantStrategy("database")}
                />
                <label htmlFor="strategy1" className="ml-2">Database Separation</label>
              </div>
              <div className="flex items-center">
                <input 
                  type="radio" 
                  id="strategy2" 
                  name="tenantStrategy" 
                  className="w-4 h-4 text-primary focus:ring-primary"
                  checked={tenantStrategy === "schema"}
                  onChange={() => setTenantStrategy("schema")}
                />
                <label htmlFor="strategy2" className="ml-2">Schema Separation</label>
              </div>
              <div className="flex items-center">
                <input 
                  type="radio" 
                  id="strategy3" 
                  name="tenantStrategy" 
                  className="w-4 h-4 text-primary focus:ring-primary"
                  checked={tenantStrategy === "row"}
                  onChange={() => setTenantStrategy("row")}
                />
                <label htmlFor="strategy3" className="ml-2">Row-Level Separation</label>
              </div>
            </div>
            
            <div className="mt-4">
              <h4 className="font-medium mb-2">Tenant Identification</h4>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="subdomain" 
                    className="w-4 h-4 text-primary focus:ring-primary" 
                    checked={subdomainRouting}
                    onChange={() => setSubdomainRouting(!subdomainRouting)}
                  />
                  <label htmlFor="subdomain" className="ml-2">Subdomain Routing</label>
                </div>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="path" 
                    className="w-4 h-4 text-primary focus:ring-primary"
                    checked={pathRouting}
                    onChange={() => setPathRouting(!pathRouting)}
                  />
                  <label htmlFor="path" className="ml-2">Path-Based Routing</label>
                </div>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="header" 
                    className="w-4 h-4 text-primary focus:ring-primary"
                    checked={headerRouting}
                    onChange={() => setHeaderRouting(!headerRouting)}
                  />
                  <label htmlFor="header" className="ml-2">Request Header</label>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-3">Create Test Tenant</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Tenant Name</label>
                <input 
                  type="text" 
                  placeholder="Test Company" 
                  className="w-full p-2 border rounded focus:ring-1 focus:ring-primary focus:border-primary"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Domain Identifier</label>
                <div className="flex">
                  <input 
                    type="text" 
                    placeholder="testcompany" 
                    className="w-full p-2 border rounded-l focus:ring-1 focus:ring-primary focus:border-primary"
                    value={domainIdentifier}
                    onChange={(e) => setDomainIdentifier(e.target.value)}
                  />
                  <span className="inline-flex items-center px-3 border border-l-0 rounded-r bg-gray-100">
                    .bsbc.local
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Admin Email</label>
                <input 
                  type="email" 
                  placeholder="admin@testcompany.com" 
                  className="w-full p-2 border rounded focus:ring-1 focus:ring-primary focus:border-primary"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Plan</label>
                <select 
                  className="w-full p-2 border rounded focus:ring-1 focus:ring-primary focus:border-primary"
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                >
                  <option>Free Trial</option>
                  <option>Basic</option>
                  <option>Premium</option>
                  <option>Enterprise</option>
                </select>
              </div>
            </div>
            
            <button 
              className="bg-primary hover:bg-secondary text-white px-4 py-2 rounded-md transition-colors mt-4"
              onClick={handleCreateTenant}
              disabled={createTenantMutation.isPending}
            >
              {createTenantMutation.isPending ? 'Creating...' : 'Create Tenant'}
            </button>
          </div>
        </div>
        
        <h3 className="text-lg font-medium mb-2">Existing Tenants</h3>
        <div className="overflow-x-auto mb-4">
          <table className="min-w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border text-left">ID</th>
                <th className="px-4 py-2 border text-left">Name</th>
                <th className="px-4 py-2 border text-left">Domain</th>
                <th className="px-4 py-2 border text-left">Plan</th>
                <th className="px-4 py-2 border text-left">Status</th>
                <th className="px-4 py-2 border text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-2 border text-center">Loading tenants...</td>
                </tr>
              ) : tenants.length > 0 ? (
                tenants.map((tenant: any) => (
                  <tr key={tenant.id}>
                    <td className="px-4 py-2 border">{tenant.id}</td>
                    <td className="px-4 py-2 border">{tenant.name}</td>
                    <td className="px-4 py-2 border">{tenant.domain}</td>
                    <td className="px-4 py-2 border">{tenant.plan}</td>
                    <td className="px-4 py-2 border">
                      <span className={`px-2 py-1 ${tenant.status === 'active' ? 'bg-success' : 'bg-warning'} text-white text-xs rounded-full`}>
                        {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-2 border">
                      <button className="text-primary hover:text-secondary">
                        <i className="fas fa-edit"></i>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-2 border text-center">No tenants found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="bg-light p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Tenant Middleware</h3>
          <div className="code-block bg-[#f5f5f5] rounded-md p-4 font-mono overflow-x-auto">
            <pre>
              <span className="text-green-600">// Register in app/Http/Kernel.php</span>{"\n"}
              <span className="text-blue-600">protected</span> <span className="text-amber-700">$middlewareGroups</span> = [{"\n"}
              {"    "}<span className="text-red-600">'web'</span> {'=>'} [{"\n"}
              {"        "}\App\Http\Middleware\EncryptCookies::class,{"\n"}
              {"        "}\Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,{"\n"}
              {"        "}\Illuminate\Session\Middleware\StartSession::class,{"\n"}
              {"        "}<span className="text-green-600">// Add tenant middleware here</span>{"\n"}
              {"        "}\App\Http\Middleware\ResolveTenantFromDomain::class,{"\n"}
              {"        "}<span className="text-green-600">// ...</span>{"\n"}
              {"    "}],{"\n"}
              ];
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

export default MultiTenantSetup;
