import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface SidebarProps {
  isMobile: boolean;
  isOpen: boolean;
  toggleSidebar: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: string;
}

export function Sidebar({ isMobile, isOpen, toggleSidebar }: SidebarProps) {
  const [, setLocation] = useLocation();
  const [activeItem, setActiveItem] = useState("overview");
  
  const { data: user } = useQuery({
    queryKey: ["/api/users/current"],
  });

  const menuItems: MenuItem[] = [
    { id: "overview", label: "Overview", icon: "fa-home" },
    { id: "clone", label: "Repository Clone", icon: "fa-code-branch" },
    { id: "environment", label: "Environment Setup", icon: "fa-cogs" },
    { id: "autologin", label: "Auto-Login Config", icon: "fa-sign-in-alt" },
    { id: "structure", label: "Repo Structure", icon: "fa-sitemap" },
    { id: "tenants", label: "Multi-Tenant Setup", icon: "fa-users" },
    { id: "subscriptions", label: "Subscription Config", icon: "fa-credit-card" },
    { id: "verification", label: "Verification", icon: "fa-check-circle" },
  ];
  
  // Additional application pages (these will use router navigation)
  const appPages = [
    { id: "properties", label: "Property Management", icon: "fa-building", path: "/properties" },
    { id: "tenant-tests", label: "Tenant Testing", icon: "fa-vial", path: "/tenants/test" },
  ];

  const handleMenuItemClick = (item: string, path?: string) => {
    setActiveItem(item);
    if (isMobile) {
      toggleSidebar();
    }
    // If path is provided, navigate to that path, otherwise navigate to hash
    setLocation(path ? path : `/#${item}`);
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash && menuItems.some(item => item.id === hash)) {
        setActiveItem(hash);
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  const sidebarClass = isMobile
    ? `bg-dark w-64 text-white flex flex-col h-full transition-all duration-300 shadow-lg fixed z-20 inset-y-0 left-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`
    : "bg-dark w-64 text-white flex flex-col h-full transition-all duration-300 shadow-lg";

  return (
    <div className={sidebarClass}>
      <div className="p-4 border-b border-dark-medium flex items-center space-x-3">
        <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
          <i className="fas fa-code text-white"></i>
        </div>
        <h1 className="text-xl font-semibold">BSBC Dev Setup</h1>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-4 mb-2">
          <h3 className="text-xs uppercase font-semibold text-gray-400">SaaS Framework</h3>
        </div>
        <ul className="space-y-1 mb-6">
          {menuItems.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={`flex items-center px-4 py-3 ${
                  activeItem === item.id
                    ? "bg-primary text-white"
                    : "hover:bg-dark-medium"
                } transition-colors`}
                onClick={(e) => {
                  e.preventDefault();
                  handleMenuItemClick(item.id);
                }}
              >
                <i className={`fas ${item.icon} w-6`}></i>
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
        
        {appPages.length > 0 && (
          <>
            <div className="px-4 mb-2">
              <h3 className="text-xs uppercase font-semibold text-gray-400">Application</h3>
            </div>
            <ul className="space-y-1">
              {appPages.map((item) => (
                <li key={item.id}>
                  <a
                    href={item.path}
                    className={`flex items-center px-4 py-3 ${
                      activeItem === item.id
                        ? "bg-primary text-white"
                        : "hover:bg-dark-medium"
                    } transition-colors`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleMenuItemClick(item.id, item.path);
                    }}
                  >
                    <i className={`fas ${item.icon} w-6`}></i>
                    <span>{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>
      
      <div className="p-4 border-t border-dark-medium">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-semibold">
              {user?.username?.[0]?.toUpperCase() || "DU"}
            </span>
          </div>
          <div>
            <div className="text-sm font-semibold">{user?.username || "Dev User"}</div>
            <div className="text-xs text-gray-400">{user?.role || "Developer"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
