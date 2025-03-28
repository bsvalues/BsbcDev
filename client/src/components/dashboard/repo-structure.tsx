import { useToast } from "@/hooks/use-toast";

export function RepoStructure() {
  const { toast } = useToast();
  
  const handleExploreStructure = () => {
    toast({
      title: "Exploring Structure",
      description: "Exploring repository structure in file browser",
    });
  };
  
  const handleViewDocumentation = () => {
    toast({
      title: "Documentation",
      description: "Documentation is being loaded",
    });
    
    // Move to next section after delay
    setTimeout(() => {
      window.location.hash = "tenants";
    }, 1000);
  };

  return (
    <section id="structure" className="mb-8">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">Repository Structure</h2>
        <p className="mb-4">Overview of the BSBC repository structure and SaaS components.</p>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2 flex items-center">
              <i className="fas fa-folder-open text-primary mr-2"></i>
              Core Components
            </h3>
            <ul className="space-y-1 text-sm">
              <li className="flex items-center">
                <i className="fas fa-folder text-yellow-500 mr-2 w-5"></i>
                app/
              </li>
              <li className="flex items-center ml-5">
                <i className="fas fa-folder text-yellow-500 mr-2 w-5"></i>
                Controllers/
              </li>
              <li className="flex items-center ml-5">
                <i className="fas fa-folder text-yellow-500 mr-2 w-5"></i>
                Models/
              </li>
              <li className="flex items-center ml-5">
                <i className="fas fa-folder text-yellow-500 mr-2 w-5"></i>
                Services/
              </li>
              <li className="flex items-center">
                <i className="fas fa-folder text-yellow-500 mr-2 w-5"></i>
                config/
              </li>
              <li className="flex items-center">
                <i className="fas fa-folder text-yellow-500 mr-2 w-5"></i>
                routes/
              </li>
              <li className="flex items-center">
                <i className="fas fa-folder text-yellow-500 mr-2 w-5"></i>
                database/
              </li>
            </ul>
          </div>
          
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2 flex items-center">
              <i className="fas fa-layer-group text-primary mr-2"></i>
              SaaS Components
            </h3>
            <ul className="space-y-1 text-sm">
              <li className="flex items-center">
                <i className="fas fa-folder text-yellow-500 mr-2 w-5"></i>
                app/Tenancy/
              </li>
              <li className="flex items-center ml-5">
                <i className="fas fa-file-code text-blue-500 mr-2 w-5"></i>
                TenantManager.php
              </li>
              <li className="flex items-center">
                <i className="fas fa-folder text-yellow-500 mr-2 w-5"></i>
                app/Billing/
              </li>
              <li className="flex items-center ml-5">
                <i className="fas fa-file-code text-blue-500 mr-2 w-5"></i>
                SubscriptionService.php
              </li>
              <li className="flex items-center">
                <i className="fas fa-folder text-yellow-500 mr-2 w-5"></i>
                app/Auth/
              </li>
              <li className="flex items-center">
                <i className="fas fa-folder text-yellow-500 mr-2 w-5"></i>
                config/tenancy.php
              </li>
            </ul>
          </div>
          
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2 flex items-center">
              <i className="fas fa-tools text-primary mr-2"></i>
              Development Tools
            </h3>
            <ul className="space-y-1 text-sm">
              <li className="flex items-center">
                <i className="fas fa-file-code text-blue-500 mr-2 w-5"></i>
                package.json
              </li>
              <li className="flex items-center">
                <i className="fas fa-file-code text-blue-500 mr-2 w-5"></i>
                composer.json
              </li>
              <li className="flex items-center">
                <i className="fas fa-file-alt text-gray-500 mr-2 w-5"></i>
                .env.example
              </li>
              <li className="flex items-center">
                <i className="fas fa-file-code text-blue-500 mr-2 w-5"></i>
                webpack.mix.js
              </li>
              <li className="flex items-center">
                <i className="fas fa-folder text-yellow-500 mr-2 w-5"></i>
                tests/
              </li>
              <li className="flex items-center">
                <i className="fas fa-file-code text-blue-500 mr-2 w-5"></i>
                docker-compose.yml
              </li>
            </ul>
          </div>
        </div>
        
        <h3 className="text-lg font-medium mb-2">Key Configuration Files</h3>
        <div className="overflow-x-auto mb-4">
          <table className="min-w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border text-left">File</th>
                <th className="px-4 py-2 border text-left">Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-2 border font-mono text-sm">config/app.php</td>
                <td className="px-4 py-2 border">Main application configuration</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border font-mono text-sm">config/tenancy.php</td>
                <td className="px-4 py-2 border">Multi-tenant configuration settings</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border font-mono text-sm">config/auth.php</td>
                <td className="px-4 py-2 border">Authentication configuration</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border font-mono text-sm">config/database.php</td>
                <td className="px-4 py-2 border">Database connection settings</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border font-mono text-sm">app/Providers/DevServiceProvider.php</td>
                <td className="px-4 py-2 border">Development mode service provider</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="flex space-x-3 mt-4">
          <button 
            className="bg-primary hover:bg-secondary text-white px-4 py-2 rounded-md transition-colors flex items-center"
            onClick={handleExploreStructure}
          >
            <i className="fas fa-search mr-2"></i>
            Explore Structure
          </button>
          <button 
            className="border border-dark-light hover:bg-light text-dark-medium px-4 py-2 rounded-md transition-colors flex items-center"
            onClick={handleViewDocumentation}
          >
            <i className="fas fa-file-alt mr-2"></i>
            View Documentation
          </button>
        </div>
      </div>
    </section>
  );
}

export default RepoStructure;
