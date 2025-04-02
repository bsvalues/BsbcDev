import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/ui/sidebar";
import ProgressTracker from "@/components/ui/progress-tracker";
import DevModeToggle from "@/components/dev-mode-toggle";
import Overview from "@/components/dashboard/overview";
import RepositoryClone from "@/components/dashboard/repository-clone";
import EnvironmentSetup from "@/components/dashboard/environment-setup";
import AutoLoginConfig from "@/components/dashboard/auto-login-config";
import RepoStructure from "@/components/dashboard/repo-structure";
import MultiTenantSetup from "@/components/dashboard/multi-tenant-setup";
import SubscriptionConfig from "@/components/dashboard/subscription-config";
import SystemVerification from "@/components/dashboard/system-verification";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();

  const { data: authStatus, isLoading } = useQuery({
    queryKey: ["/api/auth/status"],
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

  // Show authentication status
  useEffect(() => {
    if (!isLoading && authStatus) {
      if (authStatus.authenticated) {
        toast({
          title: "Authenticated",
          description: "Development auto-login active",
        });
      }
    }
  }, [authStatus, isLoading, toast]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
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
          <h2 className="text-xl font-semibold text-dark">BSBC Development Environment</h2>
          <div className="flex items-center space-x-4">
            <span className="bg-success text-white px-3 py-1 rounded-full text-xs">Development Mode</span>
          </div>
        </header>

        <main className="p-6">
          <ProgressTracker />
          
          <DevModeToggle />
          <Overview />
          <RepositoryClone />
          <EnvironmentSetup />
          <AutoLoginConfig />
          <RepoStructure />
          <MultiTenantSetup />
          <SubscriptionConfig />
          <SystemVerification />
        </main>
      </div>
    </div>
  );
}
