import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function EnvironmentSetup() {
  const { toast } = useToast();
  const [envFile, setEnvFile] = useState(false);
  
  const handleSetupEnvironment = () => {
    setEnvFile(true);
    toast({
      title: "Environment Setup",
      description: "Environment setup process started",
    });
  };
  
  const handleVerifySetup = () => {
    if (envFile) {
      toast({
        title: "Setup Verified",
        description: "Environment is properly configured",
        variant: "default",
      });
      
      // Move to next section
      setTimeout(() => {
        window.location.hash = "autologin";
      }, 1000);
    } else {
      toast({
        title: "Verification Failed",
        description: "Please set up the environment first",
        variant: "destructive",
      });
    }
  };

  return (
    <section id="environment" className="mb-8">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">Environment Setup</h2>
        <p className="mb-4">Set up the development environment with all required dependencies.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">1. Install Dependencies</h3>
            <div className="code-block bg-[#f5f5f5] rounded-md p-4 font-mono overflow-x-auto">
              <pre>
                <span className="text-green-600"># Using npm</span>{"\n"}
                <span className="text-amber-700">npm</span> <span className="text-blue-600">install</span>{"\n\n"}
                <span className="text-green-600"># OR using yarn</span>{"\n"}
                <span className="text-amber-700">yarn</span> <span className="text-blue-600">install</span>
              </pre>
            </div>
          </div>
          
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">2. Configure Environment Variables</h3>
            <div className="code-block bg-[#f5f5f5] rounded-md p-4 font-mono overflow-x-auto">
              <pre>
                <span className="text-green-600"># Copy the example environment file</span>{"\n"}
                <span className="text-amber-700">cp</span> .env.example .env{"\n\n"}
                <span className="text-green-600"># Open and edit the .env file</span>{"\n"}
                <span className="text-amber-700">nano</span> .env
              </pre>
            </div>
          </div>
        </div>
        
        <h3 className="text-lg font-medium mb-2">Required Environment Variables</h3>
        <div className="overflow-x-auto mb-4">
          <table className="min-w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border text-left">Variable</th>
                <th className="px-4 py-2 border text-left">Description</th>
                <th className="px-4 py-2 border text-left">Example</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-2 border">DB_CONNECTION</td>
                <td className="px-4 py-2 border">Database connection type</td>
                <td className="px-4 py-2 border font-mono text-sm">mysql</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border">DB_HOST</td>
                <td className="px-4 py-2 border">Database host</td>
                <td className="px-4 py-2 border font-mono text-sm">127.0.0.1</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border">DB_PORT</td>
                <td className="px-4 py-2 border">Database port</td>
                <td className="px-4 py-2 border font-mono text-sm">3306</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border">DB_DATABASE</td>
                <td className="px-4 py-2 border">Database name</td>
                <td className="px-4 py-2 border font-mono text-sm">bsbc_dev</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border">DB_USERNAME</td>
                <td className="px-4 py-2 border">Database username</td>
                <td className="px-4 py-2 border font-mono text-sm">root</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border">APP_ENV</td>
                <td className="px-4 py-2 border">Application environment</td>
                <td className="px-4 py-2 border font-mono text-sm">development</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border">DEV_MODE</td>
                <td className="px-4 py-2 border">Enable development mode features</td>
                <td className="px-4 py-2 border font-mono text-sm">true</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="bg-light p-4 rounded-lg mb-4">
          <h3 className="text-lg font-medium mb-2">Dependency Status</h3>
          <div className="space-y-2">
            <div className="flex items-center">
              <div className="w-40">Node.js:</div>
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 rounded-full bg-success mr-2"></span>
                <span>v16.14.0 (Required: {'>'}=14.0.0)</span>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-40">npm:</div>
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 rounded-full bg-success mr-2"></span>
                <span>v8.3.1 (Required: {'>'}=6.0.0)</span>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-40">Database:</div>
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 rounded-full bg-warning mr-2"></span>
                <span>MySQL 5.7 (Needs configuration)</span>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-40">.env File:</div>
              <div className="flex items-center">
                <span className={`inline-block w-3 h-3 rounded-full ${envFile ? "bg-success" : "bg-error"} mr-2`}></span>
                <span>{envFile ? "Created" : "Not found (Required)"}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-3 mt-4">
          <button 
            className="bg-primary hover:bg-secondary text-white px-4 py-2 rounded-md transition-colors flex items-center"
            onClick={handleSetupEnvironment}
          >
            <i className="fas fa-cogs mr-2"></i>
            Setup Environment
          </button>
          <button 
            className="border border-dark-light hover:bg-light text-dark-medium px-4 py-2 rounded-md transition-colors flex items-center"
            onClick={handleVerifySetup}
          >
            <i className="fas fa-check-circle mr-2"></i>
            Verify Setup
          </button>
        </div>
      </div>
    </section>
  );
}

export default EnvironmentSetup;
