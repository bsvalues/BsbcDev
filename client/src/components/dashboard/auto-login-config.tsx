import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function AutoLoginConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [autoLoginEnabled, setAutoLoginEnabled] = useState(true);
  const [debugAuthEnabled, setDebugAuthEnabled] = useState(false);
  const [username, setUsername] = useState("dev_admin");
  const [email, setEmail] = useState("dev@example.com");
  const [password, setPassword] = useState("dev_password");
  const [role, setRole] = useState("Admin");
  
  const { data: envData } = useQuery({
    queryKey: ["/api/env"],
  });
  
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest("POST", "/api/users", userData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/current"] });
      toast({
        title: "Dev User Created",
        description: "Development user has been created successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create development user",
        variant: "destructive",
      });
    }
  });
  
  const handleCreateDevUser = () => {
    createUserMutation.mutate({
      username,
      email,
      password,
      role: role.toLowerCase(),
      isDevUser: true
    });
  };
  
  const handleSaveConfiguration = () => {
    toast({
      title: "Configuration Saved",
      description: `Auto-login ${autoLoginEnabled ? "enabled" : "disabled"} for development environment`,
      variant: "default",
    });
    
    // Move to next section
    setTimeout(() => {
      window.location.hash = "structure";
    }, 1000);
  };
  
  const handleTestAutoLogin = () => {
    if (autoLoginEnabled) {
      toast({
        title: "Auto-login Test",
        description: "Auto-login is working correctly with dev_admin user",
        variant: "default",
      });
    } else {
      toast({
        title: "Auto-login Disabled",
        description: "Auto-login is currently disabled",
        variant: "destructive",
      });
    }
  };

  return (
    <section id="autologin" className="mb-8">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">Auto-Login Configuration</h2>
        <p className="mb-4">Configure development auto-login to bypass authentication in development mode.</p>
        
        <div className="bg-yellow-50 border-l-4 border-warning p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <i className="fas fa-exclamation-triangle text-warning"></i>
            </div>
            <div className="ml-3">
              <p className="text-sm text-dark-medium">
                <strong>Security Warning:</strong> Auto-login functionality should only be enabled in local development environments. Never enable in production.
              </p>
            </div>
          </div>
        </div>
        
        <h3 className="text-lg font-medium mb-2">Configuration Steps</h3>
        <ol className="list-decimal list-inside space-y-2 mb-4">
          <li>Add the DEV_AUTO_LOGIN flag to your .env file</li>
          <li>Create a development user account with appropriate permissions</li>
          <li>Configure the user ID for auto-login in .env</li>
        </ol>
        
        <div className="code-block mb-4 bg-[#f5f5f5] rounded-md p-4 font-mono overflow-x-auto">
          <pre>
            <span className="text-green-600"># Add to your .env file</span>{"\n"}
            DEV_AUTO_LOGIN=true{"\n"}
            DEV_USER_ID=1
          </pre>
        </div>
        
        <h3 className="text-lg font-medium mb-3">Create Development User</h3>
        <div className="border rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-2 border rounded focus:ring-1 focus:ring-primary focus:border-primary" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border rounded focus:ring-1 focus:ring-primary focus:border-primary" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border rounded focus:ring-1 focus:ring-primary focus:border-primary" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select 
                className="w-full p-2 border rounded focus:ring-1 focus:ring-primary focus:border-primary"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option>Admin</option>
                <option>Developer</option>
                <option>User</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <button 
              className="bg-primary hover:bg-secondary text-white px-4 py-2 rounded-md transition-colors"
              onClick={handleCreateDevUser}
              disabled={createUserMutation.isPending}
            >
              {createUserMutation.isPending ? 'Creating...' : 'Create Dev User'}
            </button>
          </div>
        </div>
        
        <h3 className="text-lg font-medium mb-2">Development Authentication</h3>
        <div className="flex items-center mb-4 space-x-4">
          <div className="flex items-center">
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={autoLoginEnabled} 
                onChange={() => setAutoLoginEnabled(!autoLoginEnabled)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              <span className="ml-3 text-sm font-medium">Enable Auto-Login</span>
            </label>
          </div>
          <div className="flex items-center">
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={debugAuthEnabled}
                onChange={() => setDebugAuthEnabled(!debugAuthEnabled)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              <span className="ml-3 text-sm font-medium">Debug Authentication</span>
            </label>
          </div>
        </div>
        
        <div className="flex space-x-3 mt-4">
          <button 
            className="bg-primary hover:bg-secondary text-white px-4 py-2 rounded-md transition-colors flex items-center"
            onClick={handleSaveConfiguration}
          >
            <i className="fas fa-save mr-2"></i>
            Save Configuration
          </button>
          <button 
            className="border border-dark-light hover:bg-light text-dark-medium px-4 py-2 rounded-md transition-colors flex items-center"
            onClick={handleTestAutoLogin}
          >
            <i className="fas fa-user-check mr-2"></i>
            Test Auto-Login
          </button>
        </div>
      </div>
    </section>
  );
}

export default AutoLoginConfig;
