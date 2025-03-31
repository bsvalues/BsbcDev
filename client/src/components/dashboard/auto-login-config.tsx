import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAutoLogin } from "@/hooks/use-auto-login";

export function AutoLoginConfig() {
  const { toast } = useToast();
  
  const {
    isAutoLoginEnabled,
    devUserId,
    currentUser,
    createDevUser,
    enableAutoLogin,
    disableAutoLogin,
    testAutoLogin,
    isCreatingUser,
    isUpdatingConfig
  } = useAutoLogin();
  
  const [autoLoginEnabled, setAutoLoginEnabled] = useState(isAutoLoginEnabled);
  const [debugAuthEnabled, setDebugAuthEnabled] = useState(false);
  const [username, setUsername] = useState("dev_admin");
  const [email, setEmail] = useState("dev@example.com");
  const [password, setPassword] = useState("dev_password");
  const [role, setRole] = useState("Admin");
  
  // Sync local state with the actual auto-login state
  useEffect(() => {
    setAutoLoginEnabled(isAutoLoginEnabled);
  }, [isAutoLoginEnabled]);
  
  const handleCreateDevUser = () => {
    createDevUser({
      username,
      email,
      password,
      role: role.toLowerCase(),
      isDevUser: true
    });
  };
  
  const handleSaveConfiguration = () => {
    // Authentication bypass is already active in development mode
    
    toast({
      title: "Development Mode Active",
      description: "Authentication bypass is already active with the dev-admin user",
      variant: "default",
    });
    
    // Move to next section
    setTimeout(() => {
      window.location.hash = "structure";
    }, 1000);
  };
  
  const handleTestAutoLogin = () => {
    // Make a test API call to verify authentication
    fetch('/api/users/current')
      .then(response => response.json())
      .then(data => {
        toast({
          title: "Authentication Test",
          description: `Successfully authenticated as ${data.username} with role ${data.role}`,
          variant: "default",
        });
      })
      .catch(error => {
        toast({
          title: "Authentication Error",
          description: "Failed to authenticate: " + error.message,
          variant: "destructive",
        });
      });
  };

  return (
    <section id="autologin" className="mb-8">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">Development Authentication</h2>
        <p className="mb-4">The system has the following authentication options for development:</p>
        
        <div className="bg-green-50 border-l-4 border-success p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <i className="fas fa-check-circle text-success"></i>
            </div>
            <div className="ml-3">
              <p className="text-sm text-dark-medium">
                <strong>Authentication Bypass Active:</strong> The application is running in development mode with automatic authentication bypass enabled. This means all API requests will be automatically authenticated with a development admin user.
              </p>
            </div>
          </div>
        </div>
        
        <h3 className="text-lg font-medium mb-2">Available Options</h3>
        <ol className="list-decimal list-inside space-y-2 mb-4">
          <li>Authentication Bypass: Automatically logs in all API requests (currently active)</li>
          <li>Auto-Login: Configure specific user credentials in environment variables</li>
          <li>Manual Login: Disable development authentication and use standard login</li>
        </ol>
        
        <div className="code-block mb-4 bg-[#f5f5f5] rounded-md p-4 font-mono overflow-x-auto">
          <pre>
            <span className="text-green-600"># The dev auth bypass is active with these credentials:</span>{"\n"}
            Username: dev-admin{"\n"}
            Role: admin{"\n"}
            Tenant ID: 1
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
              disabled={isCreatingUser}
            >
              {isCreatingUser ? 'Creating...' : 'Create Dev User'}
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