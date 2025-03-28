import { useToast } from "@/hooks/use-toast";

export function Overview() {
  const { toast } = useToast();
  
  const handleStartSetup = () => {
    window.location.hash = "clone";
    toast({
      title: "Setup Started",
      description: "Beginning the repository clone process",
    });
  };

  const handleViewDocs = () => {
    toast({
      title: "Documentation",
      description: "Documentation feature will be available soon",
    });
  };
  
  return (
    <section id="overview" className="mb-8">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">BSBC Development Overview</h2>
        <p className="mb-4">
          This guide will help you set up the BSBC Development environment, a SaaS application that requires proper configuration for multi-tenant functionality and development testing.
        </p>
        
        <div className="bg-blue-50 border-l-4 border-primary p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <i className="fas fa-info-circle text-primary"></i>
            </div>
            <div className="ml-3">
              <p className="text-sm text-dark-medium">
                Repository URL: <a href="https://github.com/bsvalues/BsbcDev" className="text-primary hover:underline">https://github.com/bsvalues/BsbcDev</a>
              </p>
            </div>
          </div>
        </div>
        
        <h3 className="text-lg font-medium mb-2">Setup Process</h3>
        <ol className="list-decimal list-inside space-y-2 mb-4">
          <li>Clone the repository from GitHub</li>
          <li>Set up the development environment and dependencies</li>
          <li>Configure auto-login for development mode</li>
          <li>Verify SaaS architecture components</li>
          <li>Configure multi-tenant functionality</li>
          <li>Set up subscription management</li>
          <li>Test the complete setup</li>
        </ol>
        
        <div className="flex space-x-3 mt-4">
          <button 
            className="bg-primary hover:bg-secondary text-white px-4 py-2 rounded-md transition-colors flex items-center"
            onClick={handleStartSetup}
          >
            <i className="fas fa-play mr-2"></i>
            Start Setup
          </button>
          <button 
            className="border border-dark-light hover:bg-light text-dark-medium px-4 py-2 rounded-md transition-colors flex items-center"
            onClick={handleViewDocs}
          >
            <i className="fas fa-book mr-2"></i>
            Documentation
          </button>
        </div>
      </div>
    </section>
  );
}

export default Overview;
